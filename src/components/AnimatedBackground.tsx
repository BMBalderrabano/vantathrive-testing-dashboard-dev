/**
 * Fixed aurora mesh + frosted glass layer.
 * Sits behind all app content; does not wrap or style cards.
 */
export function AnimatedBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="app-bg__mesh">
        <span className="app-bg__blob app-bg__blob--a" />
        <span className="app-bg__blob app-bg__blob--b" />
        <span className="app-bg__blob app-bg__blob--c" />
        <span className="app-bg__blob app-bg__blob--d" />
      </div>
      <div className="app-bg__glass" />
    </div>
  );
}
