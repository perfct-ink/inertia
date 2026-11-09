# Documents as Markdown for agents: render a TipTap JSON document to Markdown, and
# parse Markdown back to TipTap JSON. Pure Ruby (no Rails), so it is easy to test.
#
# Things Markdown has no place for ride along in HTML comments, so an edit keeps them:
#   - task lines keep their task id:   `- [ ] Write the spec <!-- task:12 -->`
#   - headings keep their anchor id:   `## Goals <!-- id:k3f9 -->` (heading links point at it)
#   - styled paragraphs keep the style: `Pull quote <!-- style:quote -->`
#   - blocks Markdown cannot hold (tables, video, audio, file cards, anything the
#     editor adds later) are written as `<!-- keep:3 table ... -->` and put back, as
#     they were in the document being replaced, when the comment is still there.
#     Delete the comment to delete the block.
#
# Links and images are restricted when they come in (see `parse`): a writer cannot plant a
# `javascript:` link, only keep the addresses the document already had.
#
# Covered: headings, paragraphs, bold, italic, underline (<u>), strike, inline
# code, links, bullet/ordered/task lists (bullet and ordered nest), code blocks,
# rules, line breaks and images. `unsupported` names what inside those blocks
# would be lost (marks or nodes this module does not know), so a writer can
# refuse to replace such a document wholesale.
module DocumentMarkdown
  SUPPORTED_BLOCKS = %w[heading paragraph bulletList orderedList workspaceTaskList codeBlock horizontalRule image].freeze
  MARKS = %w[bold italic strike underline code link].freeze
  # The `style` values of a paragraph besides plain body (frontend/src/data/paragraphStyle.ts).
  PARAGRAPH_STYLES = %w[title subtitle quote caption monospace].freeze
  MAX_HEADING_LEVEL = 5
  # The most Markdown one edit may carry (characters). Parsing is not free and no real document is near this.
  MAX_LENGTH = 300_000
  # Where a new link or image may point: the web, an address, or a path or anchor in the app. Anything
  # else (javascript:, data:, file:, ...) is dropped on the way in.
  SAFE_LINK = %r{\A(https?://|mailto:|tel:|/(?!/)|#)}i
  SAFE_IMAGE = %r{\A(https?://|/(?!/))}i

  TASK_COMMENT = /\s*<!--\s*task:(\d+)\s*-->\s*\z/
  HEADING_ID = /\s*<!--\s*id:([\w-]{1,64})\s*-->\s*\z/
  STYLE_COMMENT = /\s*<!--\s*style:(\w+)\s*-->\s*\z/
  KEEP_OPEN = /\A\s*<!--\s*keep:(\d+)\s+(\w+)/
  LIST_ITEM = /\A(\s*)([-*+]|\d+[.)])\s+(.*)\z/
  TASK_ITEM = /\A\[( |x|X)\]\s+(.*)\z/
  ESCAPABLE = /\\([\\`*_\[\]<>~#+\-.!()|{}])/

  module_function

  # ---- TipTap JSON -> Markdown ------------------------------------------------

  # `tasks` maps task id => status string, so done tasks are rendered ticked.
  def render(content, tasks: {})
    blocks_of(content).each_with_index.map { |block, i| render_block(block, tasks, i) }.reject(&:empty?).join("\n\n") + "\n"
  end

  # Names of things inside the document's Markdown-able blocks that Markdown here
  # cannot round-trip; empty when `parse(render(content))` keeps everything.
  def unsupported(content)
    blocks_of(content).select { |block| SUPPORTED_BLOCKS.include?(block["type"]) }.flat_map { |block| lossy_in(block) }.uniq
  end

  def blocks_of(content)
    Array(content.is_a?(Hash) ? content["content"] : nil).select { |block| block.is_a?(Hash) }
  end

  def render_block(node, tasks, index)
    case node["type"]
    when "heading" then render_heading(node)
    when "paragraph" then render_paragraph(node)
    when "bulletList" then render_list(node, 0, ordered: false)
    when "orderedList" then render_list(node, 0, ordered: true)
    when "workspaceTaskList" then render_tasks(node, tasks)
    when "codeBlock" then "```#{node.dig('attrs', 'language')}\n#{plain_text(node)}\n```"
    when "horizontalRule" then "---"
    when "image" then render_image(node)
    else render_keep(node, index)
    end
  end

  def render_heading(node)
    id = node.dig("attrs", "id")
    "#{'#' * node.dig('attrs', 'level').to_i.clamp(1, MAX_HEADING_LEVEL)} #{inline(node)}#{id ? " <!-- id:#{id} -->" : ''}"
  end

  def render_paragraph(node)
    style = node.dig("attrs", "style")
    text = escape_line_start(inline(node))
    PARAGRAPH_STYLES.include?(style) ? "#{text} <!-- style:#{style} -->".strip : text
  end

  def render_image(node)
    "![#{node.dig('attrs', 'alt').to_s.gsub(']', '\\]')}](#{node.dig('attrs', 'src')})"
  end

  def render_list(node, depth, ordered:)
    Array(node["content"]).each_with_index.map do |item, i|
      children = Array(item["content"])
      first = children.find { |c| c["type"] == "paragraph" }
      marker = ordered ? "#{i + 1}." : "-"
      line = "#{'  ' * depth}#{marker} #{first ? inline(first, in_list: true) : ''}"
      nested = children.select { |c| %w[bulletList orderedList].include?(c["type"]) }.map { |c| render_list(c, depth + 1, ordered: c["type"] == "orderedList") }
      ([ line ] + nested).join("\n")
    end.join("\n")
  end

  def render_tasks(node, tasks)
    Array(node["content"]).map do |item|
      id = item.dig("attrs", "taskId")
      box = tasks[id] == "done" ? "x" : " "
      "- [#{box}] #{inline(item.dig('content', 0) || {}, in_list: true)}#{id ? " <!-- task:#{id} -->" : ''}"
    end.join("\n")
  end

  # A block Markdown cannot hold, written so it can be put back (and read, for a table).
  def render_keep(node, index)
    type = node["type"].to_s.gsub(/[^\w]/, "")
    detail = case node["type"]
    when "table" then render_table(node)
    when "video" then "[video](#{node.dig('attrs', 'src')})"
    when "audio", "fileAttachment" then "[#{node.dig('attrs', 'name')}](#{node.dig('attrs', 'src')})"
    end.to_s.gsub("-->", "-- >")
    detail.empty? ? "<!-- keep:#{index} #{type} -->" : "<!-- keep:#{index} #{type}\n#{detail}\n-->"
  end

  def render_table(node)
    rows = Array(node["content"]).map { |row| Array(row["content"]).map { |cell| plain_text(cell).tr("|\n", "/ ") } }
    return "" if rows.empty?
    header, *body = rows
    ([ "| #{header.join(' | ')} |", "| #{header.map { '---' }.join(' | ')} |" ] + body.map { |r| "| #{r.join(' | ')} |" }).join("\n")
  end

  def plain_text(node)
    return node["text"].to_s if node["type"] == "text"
    Array(node["content"]).map { |c| plain_text(c) }.join(node["type"] == "table" ? "\n" : "")
  end

  # `in_list`: a line break would end the list item, so it is written as a space.
  def inline(node, in_list: false)
    Array(node["content"]).map do |child|
      next(in_list || node["type"] == "heading" ? " " : "  \n") if child["type"] == "hardBreak"
      next render_image(child) if child["type"] == "image"
      next inline(child, in_list: in_list) unless child["type"] == "text"
      mark_text(child["text"].to_s, Array(child["marks"]))
    end.join
  end

  def mark_text(text, marks)
    lead, core, trail = text.match(/\A(\s*)(.*?)(\s*)\z/m).captures
    return text if core.empty?
    code = marks.any? { |m| m["type"] == "code" }
    wrapped = marks.reject { |m| m["type"] == "code" }.reduce(code ? code_span(core) : escape(core)) do |out, mark|
      case mark["type"]
      when "bold" then "**#{out}**"
      when "italic" then "*#{out}*"
      when "strike" then "~~#{out}~~"
      when "underline" then "<u>#{out}</u>"
      when "link" then "[#{out}](#{mark.dig('attrs', 'href')})"
      else out
      end
    end
    lead + wrapped + trail
  end

  def code_span(text)
    fence = "`" * (text.scan(/`+/).map(&:size).max.to_i + 1)
    "#{fence}#{text}#{fence}"
  end

  # Backslash-escapes what would otherwise read as formatting when the text comes back.
  def escape(text)
    text.gsub(/[\\`*\[\]<~]/) { |c| "\\#{c}" }.gsub(/(?<![[:alnum:]])_|_(?![[:alnum:]])/) { "\\_" }
  end

  # A paragraph that starts like a heading, quote or list must not become one.
  def escape_line_start(line)
    line.sub(/\A(\s*)([#>+-])/) { "#{Regexp.last_match(1)}\\#{Regexp.last_match(2)}" }.sub(/\A(\s*\d+)([.)])/) { "#{Regexp.last_match(1)}\\#{Regexp.last_match(2)}" }
  end

  # Things inside a Markdown-able block that would be lost (see `unsupported`).
  def lossy_in(block)
    case block["type"]
    when "heading", "paragraph" then lossy_inline(block)
    when "bulletList", "orderedList" then Array(block["content"]).flat_map { |item| lossy_list_item(item) }
    when "workspaceTaskList" then Array(block["content"]).flat_map { |item| lossy_task_item(item) }
    when "codeBlock" then Array(block["content"]).map { |n| n["type"] }.reject { |t| t == "text" }
    else []
    end
  end

  def lossy_inline(node, in_list: false)
    Array(node["content"]).flat_map do |child|
      case child["type"]
      when "text" then Array(child["marks"]).map { |m| m["type"] }.reject { |t| MARKS.include?(t) }.map { |t| "#{t} formatting" }
      when "hardBreak" then in_list ? [ "line breaks inside a list" ] : []
      when "image" then []
      else [ child["type"].to_s ]
      end
    end
  end

  def lossy_list_item(item)
    return [ item["type"].to_s ] unless item["type"] == "listItem"
    first, *rest = Array(item["content"])
    found = first && first["type"] == "paragraph" ? lossy_inline(first, in_list: true) : [ first ? first["type"].to_s : "empty list item" ]
    rest.each { |child| found.concat(%w[bulletList orderedList].include?(child["type"]) ? lossy_in(child) : [ child["type"].to_s ]) }
    found
  end

  def lossy_task_item(item)
    children = Array(item["content"])
    return [ item["type"].to_s ] unless item["type"] == "workspaceTaskItem" && children.size == 1 && children.first["type"] == "paragraph"
    lossy_inline(children.first, in_list: true)
  end

  # ---- Markdown -> TipTap JSON ------------------------------------------------

  # `title` becomes the leading heading when the Markdown doesn't start with one
  # (a document must begin with a heading). `original` is the document's current
  # content: it supplies the blocks that `<!-- keep:N -->` comments stand for, and
  # the link and image addresses that stay allowed even when they are not "safe" ones.
  def parse(markdown, title: "Untitled", original: nil)
    context = { kept: blocks_of(original), used: {}, heading_ids: {} }
    blocks = parse_blocks(markdown.to_s.gsub("\r\n", "\n").split("\n"), context)
    blocks.unshift(heading_node(1, title)) unless blocks.first && blocks.first["type"] == "heading"
    { "type" => "doc", "content" => scrub_blocks(blocks, urls_in(original)) }
  end

  # Every link href and image src in a content tree.
  def urls_in(node, found = Set.new)
    case node
    when Hash
      found << node.dig("attrs", "href") if node["type"] == "link"
      found << node.dig("attrs", "src") if node["type"] == "image"
      node.each_value { |value| urls_in(value, found) }
    when Array then node.each { |value| urls_in(value, found) }
    end
    found
  end

  # Drops links and images that point somewhere unsafe and are not already in the
  # document: a link loses its mark (the text stays); an image becomes its alt text.
  def scrub_blocks(blocks, known)
    blocks.filter_map do |block|
      next scrub_node(block, known) unless block["type"] == "image"
      next block if url_allowed?(block.dig("attrs", "src"), SAFE_IMAGE, known)
      alt = block.dig("attrs", "alt").to_s
      { "type" => "paragraph", "content" => [ text_node(alt, []) ] } unless alt.empty?
    end
  end

  def scrub_node(node, known)
    return node unless node.is_a?(Hash)
    node = node.dup
    if node["marks"]
      marks = node["marks"].reject { |mark| mark["type"] == "link" && !url_allowed?(mark.dig("attrs", "href"), SAFE_LINK, known) }
      marks.empty? ? node.delete("marks") : node["marks"] = marks
    end
    if node["content"].is_a?(Array)
      children = node["content"].filter_map do |child|
        next scrub_node(child, known) unless child.is_a?(Hash) && child["type"] == "image"
        next child if url_allowed?(child.dig("attrs", "src"), SAFE_IMAGE, known)
        alt = child.dig("attrs", "alt").to_s
        text_node(alt, []) unless alt.empty?
      end
      # Text that lost a link mark may now sit next to text with the same marks.
      children = merge_text(children) if children != node["content"]
      children.empty? ? node.delete("content") : node["content"] = children
    end
    node
  end

  def url_allowed?(url, safe, known)
    safe.match?(url.to_s) || known.include?(url)
  end

  def heading_node(level, text)
    { "type" => "heading", "attrs" => { "level" => level }, "content" => inline_nodes(text) }
  end

  def parse_blocks(lines, context)
    blocks = []
    i = 0
    while i < lines.size
      line = lines[i]
      if line.strip.empty?
        i += 1
      elsif (m = line.match(KEEP_OPEN))
        i += 1 until i >= lines.size || lines[i].include?("-->")
        i += 1
        kept = kept_block(context, m[1].to_i, m[2])
        blocks << kept if kept
      elsif line =~ /\A```(\w*)\s*\z/
        language = Regexp.last_match(1)
        i += 1
        code = []
        while i < lines.size && lines[i] !~ /\A```\s*\z/
          code << lines[i]
          i += 1
        end
        i += 1
        node = { "type" => "codeBlock", "attrs" => { "language" => language.presence } }
        node["content"] = [ { "type" => "text", "text" => code.join("\n") } ] unless code.empty?
        blocks << node
      elsif (m = line.match(/\A(#+)\s+(.*)\z/))
        blocks << heading_from(m[1].size, m[2], context)
        i += 1
      elsif line =~ /\A\s*([-*_])(\s*\1){2,}\s*\z/
        blocks << { "type" => "horizontalRule" }
        i += 1
      elsif line =~ LIST_ITEM
        items = []
        while i < lines.size && lines[i] =~ LIST_ITEM
          items << lines[i]
          i += 1
        end
        blocks.concat(parse_list(items))
      else
        paragraph = []
        while i < lines.size && !lines[i].strip.empty? && lines[i] !~ /\A```/ && lines[i] !~ /\A#+\s/ && lines[i] !~ LIST_ITEM && lines[i] !~ KEEP_OPEN
          paragraph << lines[i]
          i += 1
        end
        blocks.concat(split_images(styled_paragraph(paragraph)))
      end
    end
    blocks
  end

  # The block a keep comment stands for, once: only a block the editor holds that
  # Markdown cannot (a comment can't smuggle in a copy of a normal block).
  def kept_block(context, index, type)
    block = context[:kept][index]
    return nil unless block && block["type"].to_s.gsub(/[^\w]/, "") == type && !SUPPORTED_BLOCKS.include?(block["type"]) && !context[:used][index]
    context[:used][index] = true
    JSON.parse(block.to_json)
  end

  def heading_from(level, text, context)
    id = text[HEADING_ID, 1]
    node = heading_node(level.clamp(1, MAX_HEADING_LEVEL), text.sub(HEADING_ID, "").sub(/\s+#+\s*\z/, ""))
    # An id is kept once; a repeated one is dropped so the editor gives that heading a fresh one.
    node["attrs"]["id"] = id if id && !context[:heading_ids].key?(id)
    context[:heading_ids][id] = true if id
    node
  end

  # Lines of one paragraph. A line ending in two spaces or a backslash is a hard
  # break; any other line break is a space.
  def styled_paragraph(lines)
    text = lines.each_with_index.map do |raw, i|
      next raw.strip if i == lines.size - 1
      hard = raw.match?(/ {2,}\z/) || raw.match?(/(?<!\\)\\\z/)
      body = raw.strip
      hard ? "#{body.sub(/(?<!\\)\\\z/, '')}  \n" : "#{body} "
    end.join
    style = text[STYLE_COMMENT, 1]
    node = paragraph_node(text.sub(STYLE_COMMENT, ""))
    node["attrs"] = { "style" => style } if PARAGRAPH_STYLES.include?(style)
    node
  end

  # Images are blocks in the editor, so an image inside a paragraph splits it.
  def split_images(paragraph)
    content = Array(paragraph["content"])
    return [ paragraph ] unless content.any? { |n| n["type"] == "image" }
    blocks = []
    run = []
    flush = lambda do
      blocks << { "type" => "paragraph", "content" => run } unless run.empty?
      run = []
    end
    content.each do |n|
      if n["type"] == "image"
        flush.call
        blocks << n
      else
        run << n
      end
    end
    flush.call
    blocks
  end

  def paragraph_node(text)
    nodes = inline_nodes(text)
    node = { "type" => "paragraph" }
    node["content"] = nodes unless nodes.empty?
    node
  end

  # Items at the same indent form a list; deeper ones nest in the previous item.
  def parse_list(lines)
    entries = lines.map do |l|
      m = LIST_ITEM.match(l)
      { indent: m[1].size, ordered: m[2] =~ /\d/ ? true : false, text: m[3] }
    end
    build_list(entries, 0, entries.first[:indent]).first
  end

  # Returns [list_nodes, next_index]: consecutive same-kind items at `indent`
  # become one list; items at greater indent become nested lists of the item above.
  def build_list(entries, start, indent)
    nodes = []
    i = start
    while i < entries.size && entries[i][:indent] >= indent
      kind = kind_of(entries[i])
      list_items = []
      after = []
      while i < entries.size && entries[i][:indent] == indent && kind_of(entries[i]) == kind
        entry = entries[i]
        i += 1
        children, i = nested_for(entries, i, indent)
        list_items << item_node(entry, kind, children)
        # A task line is a single paragraph: lists written under one come after the task list.
        after.concat(children) if kind == :task
      end
      break if list_items.empty?
      nodes << list_node(kind, list_items)
      nodes.concat(after)
    end
    [ nodes, i ]
  end

  def kind_of(entry)
    entry[:text] =~ TASK_ITEM ? :task : (entry[:ordered] ? :ordered : :bullet)
  end

  def nested_for(entries, i, indent)
    return [ [], i ] unless i < entries.size && entries[i][:indent] > indent
    build_list(entries, i, entries[i][:indent])
  end

  def item_node(entry, kind, children)
    if kind == :task
      match = TASK_ITEM.match(entry[:text])
      body = match[2]
      task_id = TASK_COMMENT.match(body)&.[](1)&.to_i
      body = body.sub(TASK_COMMENT, "")
      # "checked" is the Markdown tick, for callers to apply to the task; it is not a document attribute.
      attrs = { "taskId" => task_id, "checked" => match[1] != " " }
      { "type" => "workspaceTaskItem", "attrs" => attrs, "content" => [ paragraph_node(body) ] }
    else
      { "type" => "listItem", "content" => [ paragraph_node(entry[:text]) ] + children }
    end
  end

  def list_node(kind, items)
    type = { task: "workspaceTaskList", ordered: "orderedList", bullet: "bulletList" }.fetch(kind)
    { "type" => type, "content" => items }
  end

  # Inline Markdown to text nodes with marks.
  def inline_nodes(text)
    nodes = []
    parse_inline(text.to_s, [], nodes)
    merge_text(nodes)
  end

  INLINE = [
    [ /\*\*(.+?)\*\*/, "bold" ], [ /__(.+?)__/, "bold" ], [ /~~(.+?)~~/, "strike" ], [ %r{<u>(.+?)</u>}, "underline" ],
    [ /(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/, "italic" ], [ /(?<![_\w])_(?!\s)(.+?)(?<!\s)_(?!\w)/, "italic" ]
  ].freeze

  def parse_inline(text, marks, out)
    until text.empty?
      candidates = []
      if (m = ESCAPABLE.match(text)) then candidates << [ m, :escape ] end
      if (m = /(`+)(?!`)(.+?)(?<!`)\1(?!`)/.match(text)) then candidates << [ m, :code ] end
      if (m = /!\[([^\]]*)\]\(([^)\s]+)\)/.match(text)) then candidates << [ m, :image ] end
      if (m = /\[([^\]]+)\]\(([^)\s]+)\)/.match(text)) then candidates << [ m, :link ] end
      INLINE.each { |pattern, mark| (m = pattern.match(text)) && candidates << [ m, mark ] }
      if (m = /  \n|\\\n/.match(text)) then candidates << [ m, :break ] end
      first = candidates.min_by { |m, _| m.begin(0) }
      return out << text_node(text, marks) unless first
      match, kind = first
      out << text_node(match.pre_match, marks) unless match.pre_match.empty?
      case kind
      when :escape then out << text_node(match[1], marks)
      when :code then out << text_node(match[2], marks + [ { "type" => "code" } ])
      when :image then out << { "type" => "image", "attrs" => { "src" => match[2], "alt" => match[1].gsub("\\]", "]") } }
      when :link then parse_inline(match[1], marks + [ { "type" => "link", "attrs" => { "href" => match[2] } } ], out)
      when :break then out << { "type" => "hardBreak" }
      else parse_inline(match[1], marks + [ { "type" => kind } ], out)
      end
      text = match.post_match
    end
    out
  end

  def text_node(text, marks)
    node = { "type" => "text", "text" => text }
    node["marks"] = marks unless marks.empty?
    node
  end

  def merge_text(nodes)
    nodes.each_with_object([]) do |node, merged|
      last = merged.last
      if last && last["type"] == "text" && node["type"] == "text" && last["marks"] == node["marks"]
        last["text"] += node["text"]
      else
        merged << node
      end
    end
  end
end
