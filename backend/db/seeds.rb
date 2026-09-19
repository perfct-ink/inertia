# This file generates random data for local testing. It's meant to be run
# against a freshly wiped database (see `make db-reset` / `make db-fake`),
# not a production one — re-running it without a wipe will just pile up more
# random folders/documents/tasks/events on top of whatever's already there.

# `db:prepare` (which the production container's entrypoint runs on every
# boot) also runs db:seed the one time it creates a brand-new database —
# including production's very first boot. Found the hard way: that first boot
# created the known test@example.com / password123 login below, then crashed
# on Faker (a dev/test-only gem, absent from the production bundle) — leaving
# a default-credential account in the live database. This file must never do
# anything in production.
return if Rails.env.production?

# Root folders are each their own "app" — folders are recursive
# projects/components (see Folder#self_and_descendant_ids), so seed data
# should demonstrate that instead of looking like generic personal folders.
FOLDER_NAMES = [
  "Mobile App",
  "Admin Dashboard",
  "Marketing Site",
  "Customer Portal",
  "Internal Tools",
  "API Gateway",
  "Analytics Platform",
  "Design System"
].freeze
DOC_TITLE_PREFIXES = [ "Meeting Notes", "Project Plan", "Design Doc", "Roadmap", "Spec", "Retro", "Onboarding Guide", "Budget", "Launch Checklist" ].freeze
TASK_VERBS = %w[Fix Update Review Design Implement Test Refactor Deploy Document Investigate].freeze

puts "Seeding database with random test data..."

# A predictable login for manual testing, plus a handful of random users.
users = [
  User.find_or_create_by!(email: "test@example.com") do |u|
    u.name = "Test User"
    u.password = "password123"
  end
]

9.times do
  users << User.find_or_create_by!(email: Faker::Internet.unique.email) do |u|
    u.name = Faker::Name.name
    u.password = "password123"
  end
end

users.each do |user|
  workspace = user.workspace

  folders = FOLDER_NAMES.sample(rand(3..5)).each_with_index.map do |name, i|
    folder = workspace.folders.create!(name: name, position: i, pinned: i.zero?)
    if rand < 0.5
      workspace.folders.create!(name: Faker::Commerce.department(max: 1), parent: folder, position: 0)
    end
    folder
  end
  all_folders = workspace.folders.to_a

  documents = all_folders.flat_map do |folder|
    rand(1..4).times.map do
      doc_type = %i[document spreadsheet].sample
      folder.documents.create!(
        title: "#{DOC_TITLE_PREFIXES.sample}: #{Faker::Company.buzzword.capitalize}",
        doc_type: doc_type,
        created_by: user,
        pinned: rand < 0.15,
        content: doc_type == :document ? { type: "doc", content: [] } : {}
      )
    end
  end

  tasks = Array.new(rand(8..15)) do |i|
    Task.create!(
      workspace: workspace,
      title: "#{TASK_VERBS.sample} #{Faker::Commerce.product_name}",
      description: (Faker::Lorem.paragraph if rand < 0.6),
      status: Task.statuses.keys.sample,
      due_date: (Faker::Date.forward(days: 30) if rand < 0.5),
      position: i,
      document: (documents.sample if documents.any? && rand < 0.3),
      assignee: (rand < 0.7 ? user : nil)
    )
  end

  rand(2..5).times do
    event = workspace.events.create!(
      title: Faker::Lorem.sentence(word_count: 3).chomp("."),
      description: (Faker::Lorem.sentence if rand < 0.5),
      date: Faker::Date.between(from: 10.days.ago, to: 30.days.from_now),
      event_type: %i[deadline milestone].sample,
      start_time: (rand < 0.5 ? Faker::Time.forward(days: 5, period: :morning) : nil)
    )
    tasks.sample(rand(0..2)).each { |t| event.tasks << t unless event.tasks.include?(t) }
  end

  if (doc = documents.find(&:pinned))
    Share.find_or_create_by!(shareable: doc, created_by: user) do |s|
      s.permission = %i[view edit].sample
    end
  end
end

puts "Done. #{User.count} users, #{Workspace.count} workspaces, #{Folder.count} folders, " \
     "#{Document.count} documents, #{Task.count} tasks, #{Event.count} events, #{Share.count} shares."
puts "Log in with test@example.com / password123"
