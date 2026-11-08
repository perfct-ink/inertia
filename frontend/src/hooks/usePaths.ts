import { useMemo } from 'react'
import { documentHref, folderHref, itemAtPath, pathIndexFor, type DocumentLike } from '@/data/path'
import { usePathStore } from '@/store/paths'

// The one way to build a link to a folder or document: its hierarchical path
// (/acme/product/requirements) when the Space tree has it, else the id path
// (/documents/12), which always works.
//   const paths = usePaths()
//   <Link to={paths.document(doc)} />   <Link to={paths.folder(folder.id)} />
export function usePaths() {
  const folders = usePathStore((s) => s.folders)
  return useMemo(() => {
    const index = pathIndexFor(folders)
    return {
      // Pass the document, or just its id when the tree is all that is needed.
      document: (document: DocumentLike | number) => documentHref(index, typeof document === 'number' ? { id: document } : document),
      folder: (id: number) => folderHref(index, id),
      // The folder or document a page path names (an id path or a slug path).
      itemAt: (pathname: string) => itemAtPath(folders, pathname),
    }
  }, [folders])
}
