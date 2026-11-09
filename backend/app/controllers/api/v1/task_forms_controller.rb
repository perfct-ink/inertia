module Api
  module V1
    # The forms a Space has that turn answers into tasks. Any member can
    # build and edit forms; switching a form's public link on is for admins
    # and owners (turning it off is open to any member). With a project open
    # (X-Project-Id) the list is that project's forms, and a new form is filed
    # in the project, as with every other list.
    class TaskFormsController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_form, only: [ :show, :update, :destroy ]

      def index
        forms = in_current_project(current_workspace.task_forms).order(:title, :id).to_a
        counts = TaskFormSubmission.where(task_form_id: forms.map(&:id)).group(:task_form_id).count
        render json: TaskFormBlueprint.render(forms, counts: counts)
      end

      def show
        render json: TaskFormBlueprint.render(@form)
      end

      def create
        require_manage_in!(current_workspace.id) if enabling_public_access?(nil)
        form = file_in_current_project(current_workspace.task_forms.build(form_params.merge(created_by: current_user)))
        if form.save
          render json: TaskFormBlueprint.render(form), status: :created
        else
          render json: { errors: form.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        require_manage_in!(current_workspace.id) if enabling_public_access?(@form)
        if @form.update(form_params)
          render json: TaskFormBlueprint.render(@form)
        else
          render json: { errors: @form.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @form.destroy
        head :no_content
      end

      private

      def set_form
        @form = current_workspace.task_forms.find(params[:id])
      end

      def enabling_public_access?(form)
        ActiveModel::Type::Boolean.new.cast(params.dig(:task_form, :public_access)) == true && !form&.public_access?
      end

      def form_params
        permitted = params.require(:task_form).permit(
          :title, :description, :enabled, :public_access, :default_status, :epic_id, :folder_id, :assignee_id,
          questions: [ :id, :label, :kind, :target, :required, { options: [] } ]
        )
        permitted[:questions] = permitted[:questions].map(&:to_h) if permitted.key?(:questions)
        permitted
      end
    end
  end
end
