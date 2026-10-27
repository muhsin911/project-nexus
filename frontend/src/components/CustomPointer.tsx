import { useEffect, useRef } from 'react';

export function CustomPointer() {
  const pointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pointer = pointerRef.current;
    if (!pointer || window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const activePointer = pointer;

    function movePointer(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const pointerTarget = event.target instanceof Element
        ? event.target.closest('a, button, input, textarea, select, [role="button"]')
        : null;
      activePointer.style.setProperty('--pointer-x', `${event.clientX}px`);
      activePointer.style.setProperty('--pointer-y', `${event.clientY}px`);
      activePointer.classList.add('is-visible');
      activePointer.classList.toggle('is-active', Boolean(pointerTarget));
    }

    function hidePointer() {
      activePointer.classList.remove('is-visible', 'is-active');
    }

    document.addEventListener('pointermove', movePointer);
    document.addEventListener('pointerleave', hidePointer);
    return () => {
      document.removeEventListener('pointermove', movePointer);
      document.removeEventListener('pointerleave', hidePointer);
    };
  }, []);

  return <div className="custom-pointer" ref={pointerRef} aria-hidden="true"><span>+</span></div>;
}
