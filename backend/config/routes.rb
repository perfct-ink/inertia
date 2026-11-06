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
        get :folders, on: :member
        resources :members, controller: "workspace_members", only: [ :index, :create, :update, :destroy ]
        resources :invitations, controller: "workspace_invitations", only: [ :index, :create, :destroy ]
      end

      # Teams: groups of people that hold one role in a workspace together.
      resources :workspaces, only: [] do
        resources :teams, only: [ :index, :create, :update, :destroy ] do
          resources :members, controller: "team_members", only: [ :create, :destroy ]
        end
      end

      resources :folders do
        resources :documents, shallow: true do
          member do
            post :copy
            post :move
          end
        end
        member do
          get :contents
          post :copy
          post :move
        end
        resources :documents, shallow: true
        resources :files, only: [ :create ]
        member { get :contents }
        member do
          get :contents
          get :features
        end
        resources :baselines, only: [ :index, :create ]
      end
      resources :baselines, only: [ :destroy ]

      resources :documents, only: [] do
        resource :file, only: [ :update ], controller: "files"
        resources :tasks, only: [ :index, :create ], shallow: true
      end

      get "tables/:id", to: "tables#show"
      post "tables/:id/fields", to: "tables#create_field"
      patch "tables/:id/fields/:field_id", to: "tables#update_field"
      delete "tables/:id/fields/:field_id", to: "tables#destroy_field"
      post "tables/:id/records", to: "tables#create_record"
      patch "tables/:id/records/:record_id", to: "tables#update_record"
      delete "tables/:id/records/:record_id", to: "tables#destroy_record"

      resources :task_fields, only: [ :index, :create, :update, :destroy ]
      put "tasks/:task_id/field_values/:task_field_id", to: "task_field_values#update"
      put "tasks/:task_id/field_values/:task_field_id/vote", to: "task_field_values#vote"
      resources :tasks, only: [ :index, :create, :update, :destroy ] do
        resources :time_entries, only: [ :index, :create ]
        get :status_changes, on: :member
      end
      resources :time_entries, only: [ :destroy ] do
        member { post :stop }
      end

      resources :epics, only: [ :index, :create, :update, :destroy ]

      resources :initiatives, only: [ :index, :create, :update, :destroy ]

      resources :milestones, only: [ :index, :create, :update, :destroy ]

      resources :sprints, only: [ :index, :create, :update, :destroy ] do
        member do
          post :start
          post :close
        end
      end
      resources :resource_allocations, only: [ :index, :create, :update, :destroy ]
      # How a board labels and colours task statuses; ?folder_id= picks the board (none = the Space default).
      get "task_status_settings", to: "task_status_settings#index"
      put "task_status_settings", to: "task_status_settings#update"
      delete "task_status_settings", to: "task_status_settings#destroy"
      resources :task_dependencies, only: [ :index, :create, :destroy ]
      resources :ai_workers, only: [ :index, :create, :update, :destroy ]
      resources :ai_runs, only: [ :index, :create ]
      resource :onboarding, only: [ :show, :update ]
      resources :ideas, only: [ :index, :create, :update, :destroy ] do
        post :promote, on: :member
      end
      resources :io_nodes, only: [ :index, :create, :update, :destroy ]
      resources :releases, only: [ :index, :create, :update, :destroy ] do
        member do
          get :tasks
          post :documents, action: :add_document
          delete "documents/:document_id", action: :remove_document
        end
      end
      resource :portfolio, only: [ :show ], controller: "portfolio"
      resources :notifications, only: [ :index, :update ] do
        post :read_all, on: :collection
      end
      # The signed-in person's own custom paragraph styles (not scoped to a Space).
      resources :paragraph_styles, only: [ :index, :create ]
      resources :objectives, only: [ :index, :create, :update, :destroy ]
      resources :key_results, only: [ :create, :update, :destroy ] do
        resources :check_ins, only: [ :index, :create ], controller: "key_result_check_ins"
      end
      resources :project_requests, only: [ :index, :create, :update, :destroy ] do
        member do
          post :approve
          post :decline
          post :reopen
        end
      end

      resources :uploads, only: [ :create ]

      resources :events do
        resources :event_tasks, only: [ :create, :destroy ]
      end

      resources :quip_imports, only: [ :index, :create, :show ]

      resources :shares, only: [ :create, :show, :destroy ]
      resource :roadmap_share, only: [ :show, :create, :destroy ]
      get "shared/:token", to: "shares#access", as: :shared_access
    end
  end
end
