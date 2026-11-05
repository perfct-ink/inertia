import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/Timeline'
import { useFolderFeatures } from '@/api/documents'
import { FEATURE_STATUS_LABEL } from '@/data/feature'
import './FeatureRollup.scss'

// A folder's features (documents in feature folders), nested, each with its
// status, owner and progress including its sub-features' tasks. Hidden when the
// folder has none.
export default function FeatureRollup({ folderId }: { folderId: number }) {
  const { data: rows = [] } = useFolderFeatures(folderId)
  if (rows.length === 0) return null

  return (
    <section aria-label="Features">
      <h2 className="folder_detail-heading">Features</h2>
      <table className="feature_rollup">
        <thead>
          <tr><th scope="col">Feature</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Progress</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" style={{ paddingLeft: `${0.75 + row.depth * 1.25}rem` }}>
                <Link to={`/documents/${row.id}`}>{row.title}</Link>
              </th>
              <td>{FEATURE_STATUS_LABEL[row.status]}{row.status_derived ? ' (auto)' : ''}</td>
              <td>{row.owner_name ?? ''}</td>
              <td>
                <div className="feature_rollup-progress">
                  <ProgressBar percent={row.percent} />
                  <span>{row.done_tasks_count}/{row.tasks_count} · {row.percent}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
