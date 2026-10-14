import type { Folder } from '@/types'
import { flattenFolders } from './folder'

const folder = (id: number, children: Folder[] = []) => ({ id, name: `F${id}`, children }) as unknown as Folder

test('flattenFolders lists each folder before its descendants', () => {
  const tree = [folder(1, [folder(2, [folder(3)]), folder(4)]), folder(5)]
  expect(flattenFolders(tree).map((f) => f.id)).toEqual([1, 2, 3, 4, 5])
})
