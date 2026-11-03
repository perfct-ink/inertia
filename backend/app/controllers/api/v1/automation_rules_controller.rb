module Api
  module V1
    # The Space's automations. Members and above (not viewers) can read them;
    # admins and owners create, change, switch on or off, and delete them. A
    # rule is switched on or off with `enabled` on an update.
    class AutomationRulesController < ApplicationController
      include WorkspaceScoped
      before_action :require_member_read, if: :read_request?
      before_action :require_manage, unless: :read_request?
      before_action :set_rule, only: [ :update, :destroy ]

      def index
        render json: AutomationRuleBlueprint.render(current_workspace.automation_rules.order(:id))
      end

      def create
        rule = current_workspace.automation_rules.build(rule_params.merge(created_by: current_user))
        if rule.save
          render json: AutomationRuleBlueprint.render(rule), status: :created
        else
          render json: { errors: rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @rule.update(rule_params)
          render json: AutomationRuleBlueprint.render(@rule)
        else
          render json: { errors: @rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @rule.destroy
        head :no_content
      end

      private

      def require_member_read
        require_write_in!(current_workspace.id)
      end

      def require_manage
        require_manage_in!(current_workspace.id)
      end

      def set_rule
        @rule = current_workspace.automation_rules.find(params[:id])
      end

      # The trigger, conditions and actions are free-form JSON; the rule
      # checks them against Automations::Registry.
      def rule_params
        params.require(:automation_rule).permit(
          :name, :enabled, :trigger_type,
          trigger_config: {},
          conditions: [ :field, :operator, :value, { value: [] } ],
          actions: [ :type, { config: {} } ]
        )
      end
    end
  end
end
