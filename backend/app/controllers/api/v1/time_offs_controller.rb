module Api
  module V1
    # A person's leave. Everyone in the Space can read it (the Resources page
    # takes it off capacity); only admins and owners add, change or remove it,
    # and only they see the notes.
    class TimeOffsController < ApplicationController
      include AdminManagedList

      private

      def records
        current_workspace.time_offs
      end

      def blueprint
        TimeOffBlueprint
      end

      def render_options
        { show_note: membership_in(current_workspace.id).can_manage? }
      end

      def record_params
        params.require(:time_off).permit(:user_id, :start_date, :end_date, :note)
      end
    end
  end
end
