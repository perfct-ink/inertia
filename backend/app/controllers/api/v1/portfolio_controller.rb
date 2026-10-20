module Api
  module V1
    # Every project (a folder with kind project) with its owner, status, dates
    # and progress in one list.
    class PortfolioController < ApplicationController
      include WorkspaceScoped

      def show
        projects = current_workspace.folders.active.where(kind: :project).includes(:owner).order(:name)
        render json: projects.map { |project| row(project) }
      end

      private

      def row(project)
        tasks = project.scheduled_tasks
        total = tasks.count
        done = tasks.where(status: :done).count
        percent = total.zero? ? 0 : (done * 100.0 / total).round
        {
          id: project.id, name: project.name, owner_id: project.owner_id, owner_name: project.owner&.name,
          project_status: project.project_status, start_date: project.start_date, target_date: project.target_date,
          tasks_count: total, done_tasks_count: done, percent: percent, health: project.health(percent)
        }
      end
    end
  end
end
