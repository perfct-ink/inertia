Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # The only HTML this API renders: public marketing/SEO pages. nginx proxies
  # just these exact paths to Rails (see frontend/nginx/default.conf);
  # everything else at the root still falls through to
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
      post "auth/social/:provider/start", to: "auth/social#start", constraints: { provider: /apple|google/ }
      match "auth/social/:provider/callback", to: "auth/social#callback", via: [ :get, :post ], constraints: { provider: /apple|google/ }
      post "invitations/:token/accept", to: "workspace_invitations#accept"
      post "auth/social/exchange", to: "auth/social#exchange"
      # The workspace named by the X-Workspace-Id header (default: personal).
      resource :workspace, as: :current_workspace, only: [ :show, :update ]
      resources :workspaces, only: [ :index, :create, :destroy ] do
        resources :members, controller: "workspace_members", only: [ :index, :create, :update, :destroy ]
        resources :invitations, controller: "workspace_invitations", only: [ :index, :create, :destroy ]
      end

      resources :folders do
        resources :documents, shallow: true
        member { get :contents }
      end

      resources :documents, only: [] do
        resources :tasks, only: [ :index, :create ], shallow: true
      end

      get "tables/:id", to: "tables#show"
      post "tables/:id/fields", to: "tables#create_field"
      patch "tables/:id/fields/:field_id", to: "tables#update_field"
      delete "tables/:id/fields/:field_id", to: "tables#destroy_field"
      post "tables/:id/records", to: "tables#create_record"
      patch "tables/:id/records/:record_id", to: "tables#update_record"
      delete "tables/:id/records/:record_id", to: "tables#destroy_record"

      resources :tasks, only: [ :index, :create, :update, :destroy ]

      resources :epics, only: [ :index, :create, :update, :destroy ]

      resources :initiatives, only: [ :index, :create, :update, :destroy ]

      resources :milestones, only: [ :index, :create, :update, :destroy ]

      resources :sprints, only: [ :index, :create, :update, :destroy ]
      resources :task_dependencies, only: [ :index, :create, :destroy ]
      resources :ai_workers, only: [ :index, :create, :update, :destroy ]
      resources :ai_runs, only: [ :index, :create ]
      resources :objectives, only: [ :index, :create, :update, :destroy ]
      resources :key_results, only: [ :create, :update, :destroy ]

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
