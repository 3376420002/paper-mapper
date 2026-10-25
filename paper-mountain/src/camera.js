(function (PM) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;

  function createCameraControls(THREE, width, height) {
    const initial = {
      radius: 320,
      theta: Math.PI * 0.26,
      phi: Math.PI * 0.38,
      target: new THREE.Vector3(0, 10, 0)
    };
    const camera = new THREE.PerspectiveCamera(45, width / Math.max(height, 1), 0.1, 1000);
    const state = {
      radius: initial.radius,
      theta: initial.theta,
      phi: initial.phi,
      target: initial.target.clone(),
      autoRotate: false,
      flight: null,
      drag: null
    };

    function placeCamera() {
      const horizontal = state.radius * Math.sin(state.phi);
      camera.position.set(
        state.target.x + horizontal * Math.cos(state.theta),
        state.target.y + state.radius * Math.cos(state.phi),
        state.target.z + horizontal * Math.sin(state.theta)
      );
      camera.lookAt(state.target);
    }

    function flyTo(target, radius = Math.max(170, state.radius * 0.72), theta = state.theta, phi = state.phi) {
      state.flight = {
        startAt: performance.now(), duration: 500,
        fromTarget: state.target.clone(), toTarget: target.clone(),
        fromRadius: state.radius, toRadius: radius,
        fromTheta: state.theta, toTheta: theta,
        fromPhi: state.phi, toPhi: phi
      };
    }

    function reset() {
      flyTo(initial.target, initial.radius, initial.theta, initial.phi);
      state.autoRotate = false;
    }

    function update(now) {
      if (state.flight) {
        const flight = state.flight;
        const t = clamp((now - flight.startAt) / flight.duration, 0, 1);
        const eased = easeInOut(t);
        state.target.copy(flight.fromTarget).lerp(flight.toTarget, eased);
        state.radius = THREE.MathUtils.lerp(flight.fromRadius, flight.toRadius, eased);
        state.theta = THREE.MathUtils.lerp(flight.fromTheta, flight.toTheta, eased);
        state.phi = THREE.MathUtils.lerp(flight.fromPhi, flight.toPhi, eased);
        if (t >= 1) state.flight = null;
      } else if (state.autoRotate && !state.drag) {
        state.theta += 0.0022;
      }
      placeCamera();
    }

    function resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / Math.max(nextHeight, 1);
      camera.updateProjectionMatrix();
      placeCamera();
    }

    function attach(canvas, handlers) {
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        canvas.setPointerCapture(event.pointerId);
        state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
      });
      canvas.addEventListener('pointermove', event => {
        const drag = state.drag;
        if (drag && drag.id === event.pointerId) {
          const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
          if (distance > 6) drag.moved = true;
          if (drag.moved) {
            state.flight = null;
            state.theta -= (event.clientX - drag.lastX) * 0.0062;
            state.phi = clamp(state.phi - (event.clientY - drag.lastY) * 0.0052, Math.PI * 0.13, Math.PI * 0.475);
            placeCamera();
            handlers.onHover?.(null, event);
          }
          drag.lastX = event.clientX;
          drag.lastY = event.clientY;
          return;
        }
        handlers.onHover?.(event, event);
      });
      canvas.addEventListener('pointerup', event => {
        if (!state.drag || state.drag.id !== event.pointerId) return;
        const wasClick = !state.drag.moved && Math.hypot(event.clientX - state.drag.x, event.clientY - state.drag.y) <= 6;
        state.drag = null;
        if (wasClick) handlers.onClick?.(event);
      });
      canvas.addEventListener('pointercancel', () => { state.drag = null; });
      canvas.addEventListener('pointerleave', () => handlers.onHover?.(null));
      canvas.addEventListener('wheel', event => {
        event.preventDefault();
        state.flight = null;
        state.radius = clamp(state.radius * Math.exp(event.deltaY * 0.0011), 140, 600);
        placeCamera();
      }, { passive: false });
    }

    placeCamera();
    return { camera, state, attach, resize, update, flyTo, reset };
  }

  PM.createCameraControls = createCameraControls;
})(window.PM = window.PM || {});
