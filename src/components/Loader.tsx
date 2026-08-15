/**
 * Loading state for anything that waits on the database.
 *
 * The motif is water treatment — a beaker filling, a wave riding the
 * surface, droplets falling in — which is the department's own subject
 * matter rather than a generic spinner. Pure CSS, no client JS, so it
 * can render straight from a server `loading.tsx` boundary.
 */
export default function Loader({
  label = "Memuat data",
  hint,
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <div className="hima-loader" role="status" aria-live="polite">
      <div className="hima-loader-rig">
        <div className="hima-loader-drops" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="hima-loader-vessel" aria-hidden="true">
          <div className="hima-loader-water">
            <div className="hima-loader-wave" />
          </div>
          <div className="hima-loader-ticks">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="hima-loader-text">
        <p className="hima-loader-label">
          {label}
          <span className="hima-loader-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        {hint && <p className="hima-loader-hint">{hint}</p>}
      </div>
    </div>
  );
}
