# URL slugs for folders and documents (hierarchical URLs, e.g.
# /acme/product/requirements). Plain functions with no database access, so the
# Sluggable model concern, the backfill migration and PathResolver share one
# definition and it can be unit tested on its own.
module Slug
  # Lowercase words and digits joined by single hyphens.
  FORMAT = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
  # Slugs derived from a name are cut to this many characters (a numeric
  # suffix for uniqueness may follow, so the column allows a few more).
  MAX_LENGTH = 60
  # Used when a name has no letters or digits to build a slug from.
  FALLBACK = "untitled".freeze

  # First path segments that already mean something at the site root: SPA
  # routes (frontend/src/App.tsx), Rails/nginx pages and API prefixes. Items
  # directly under a Space's Root never take these, or /tasks would open a
  # folder named "Tasks" instead of the Tasks page. Keep in step with the
  # routes in App.tsx and with the marketing paths in config/routes.rb and
  # frontend/nginx/default.conf (slug_test.rb fails when App.tsx gains a
  # route this list lacks).
  RESERVED = %w[
    api assets cable collab mcp up health healthz status rails index
    login signup logout shared invite
    space workspace documents folders
    tasks events epics initiatives milestones sprints roadmap okrs hierarchy projects
    my-work portfolio calendar timeline inbox ideas workload pivot resources
    task-table sprint-board project-requests plan objectives-map
    features pricing about robots sitemap
    settings search dashboard dashboards notifications teams reports files new
  ].freeze

  module_function

  # "Feature Folders!" -> "feature-folders". Accents are transliterated; text
  # with nothing usable (only symbols or non-Latin letters) gives the fallback.
  def slugify(text, fallback: FALLBACK)
    base = ActiveSupport::Inflector.parameterize(text.to_s).tr("_", "-").squeeze("-").gsub(/\A-|-\z/, "")
    base = base[0, MAX_LENGTH].sub(/-+\z/, "")
    base.empty? ? fallback : base
  end

  # `base` itself when free, else base-2, base-3, ... `taken` is the slugs
  # already used by siblings; `reserved` are slugs that may never be used.
  def unique(base, taken, reserved: [])
    used = taken.to_a.compact.to_set.merge(reserved)
    candidate = base
    suffix = 1
    while used.include?(candidate)
      suffix += 1
      candidate = "#{base}-#{suffix}"
    end
    candidate
  end

  # The slugs in a request path, lowercased, without empty segments:
  # "/Acme//product/" -> ["acme", "product"].
  def split(path)
    path.to_s.split("/").map { |segment| segment.strip.downcase }.reject(&:empty?)
  end

  # ["acme", "product"] -> "acme/product" (how PathAlias stores a path).
  def join(segments)
    segments.join("/")
  end

  # ["acme", "product"] -> "/acme/product"; no segments is the Space home.
  def path(segments)
    "/#{join(segments)}"
  end
end
