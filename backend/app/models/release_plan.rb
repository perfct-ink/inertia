# The standard checklist for a release, worked back from the release date: each
# step is a number of days before (negative) or after (positive) the date.
class ReleasePlan
  Step = Struct.new(:title, :offset_days, keyword_init: true)

  MUSIC = [
    Step.new(title: "Finish writing the song", offset_days: -120),
    Step.new(title: "Record", offset_days: -100),
    Step.new(title: "Mix", offset_days: -70),
    Step.new(title: "Master", offset_days: -50),
    Step.new(title: "Artwork", offset_days: -45),
    Step.new(title: "Credits and metadata (ISRC, UPC)", offset_days: -42),
    Step.new(title: "Upload to the distributor", offset_days: -28),
    Step.new(title: "Pitch to streaming editorial (at least 7 days before; earlier is better)", offset_days: -21),
    Step.new(title: "Music video", offset_days: -14),
    Step.new(title: "Promo and social posts", offset_days: -7),
    Step.new(title: "Release day", offset_days: 0),
    Step.new(title: "Post-release follow-up", offset_days: 7)
  ].freeze

  VIDEO = [
    Step.new(title: "Script and storyboard", offset_days: -45),
    Step.new(title: "Shoot", offset_days: -30),
    Step.new(title: "Edit", offset_days: -20),
    Step.new(title: "Colour and sound", offset_days: -10),
    Step.new(title: "Upload and schedule the premiere", offset_days: -3),
    Step.new(title: "Premiere", offset_days: 0)
  ].freeze

  BY_KIND = { "single" => MUSIC, "ep" => MUSIC, "album" => MUSIC, "music_video" => VIDEO }.freeze

  def self.steps_for(kind)
    BY_KIND.fetch(kind.to_s)
  end

  # Creates the plan's tasks for `release` (a task whose title is already in the
  # plan is left alone, so running it twice adds nothing) and returns the new ones.
  def self.apply!(release)
    raise ArgumentError, "Set a release date first" if release.release_date.nil?
    existing = release.plan_tasks.pluck(:title)
    steps_for(release.kind).reject { |step| existing.include?(step.title) }.map do |step|
      release.workspace.tasks.create!(
        title: step.title, status: :todo, release: release,
        release_offset_days: step.offset_days, due_date: release.release_date + step.offset_days
      )
    end
  end
end
