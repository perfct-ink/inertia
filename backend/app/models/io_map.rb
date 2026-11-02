# Progress for every node on the map, 0 to 100 or nil when nothing measures it:
# a linked objective's or initiative's percent, else the average of the
# children that have progress.
class IoMap
  def self.progress_by_id(workspace)
    nodes = workspace.io_nodes.includes(objective: :key_results, initiative: []).to_a
    children = nodes.group_by(&:parent_id)
    memo = {}
    compute = lambda do |node|
      memo.fetch(node.id) do
        own = node.objective&.percent || node.initiative&.percent
        below = (children[node.id] || []).filter_map { |child| compute.call(child) }
        memo[node.id] = own || (below.empty? ? nil : (below.sum / below.size.to_f).round)
      end
    end
    nodes.each { |node| compute.call(node) }
    memo
  end
end
