module Api
  module V1
    # The Space's holidays. Everyone in the Space can read them (the Resources
    # page takes them off everyone's capacity); only admins and owners add,
    # change or remove them.
    class HolidaysController < ApplicationController
      include AdminManagedList

      private

      def records
        current_workspace.holidays
      end

      def blueprint
        HolidayBlueprint
      end

      def record_params
        params.require(:holiday).permit(:name, :start_date, :end_date)
      end
    end
  end
end
