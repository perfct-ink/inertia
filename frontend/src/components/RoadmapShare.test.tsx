import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import RoadmapShare from './RoadmapShare'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockRevoke = { mutate: jest.fn(), isPending: false }
let mockShare: { token: string } | null
jest.mock('@/api/roadmapShare', () => ({
  useRoadmapShare: () => ({ data: mockShare }),
  useCreateRoadmapShare: () => mockCreate,
  useDeleteRoadmapShare: () => mockRevoke,
}))

test('makes a link when there is none', () => {
  mockShare = null
  render(<RoadmapShare />)
  fireEvent.click(screen.getByRole('button', { name: /Share read-only link/ }))
  expect(mockCreate.mutate).toHaveBeenCalled()
})

test('shows the link and can stop sharing', () => {
  mockShare = { token: 'abc' }
  render(<RoadmapShare />)
  expect(screen.getByLabelText('Public roadmap link', { selector: 'input' })).toHaveValue(`${window.location.origin}/shared/abc`)
  fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }))
  expect(mockRevoke.mutate).toHaveBeenCalled()
})
