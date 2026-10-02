Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # The only HTML this API renders: public marketing/SEO pages. nginx proxies
  # just these exact paths to Rails (see deploy/server/sites-available/
  # inertia.it.com.conf); everything else at the root still falls through to
  # the static SPA build. Electron and the Capacitor iOS app never hit these —
  # both load frontend/dist/index.html straight off disk and never make a
  # network request for HTML — so these pages are web-only by construction.
  root "marketing#home"
  get "features", to: "marketing#features"
  get "pricing", to: "marketing#pricing"
  get "about", to: "marketing#about"
  get "robots.txt", to: "marketing#robots"
  get "sitemap.xml", to: "marketing#sitemap"

  devise_for :users,
    path: "api/v1/auth",
    path_names: { sign_in: "login", sign_out: "logout", registration: "signup" },
    controllers: {
      sessions: "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    }

  namespace :api do
    namespace :v1 do
      resource :workspace, only: [ :show, :update ]

      resources :folders do
        resources :documents, shallow: true
        member { get :contents }
      end

      resources :documents, only: [] do
        resources :tasks, only: [ :index, :create ], shallow: true
      end

      resources :tasks, only: [ :index, :create, :update, :destroy ]

      resources :epics, only: [ :index, :create, :update, :destroy ]

      resources :uploads, only: [ :create ]

      resources :events do
        resources :event_tasks, only: [ :create, :destroy ]
      end

      resources :quip_imports, only: [ :index, :create, :show ]

      resources :shares, only: [ :create, :show, :destroy ]
      get "shared/:token", to: "shares#access", as: :shared_access
    end
  end
end
