module Api
  module V1
    # The signed-in person's own inbox, across Spaces (not scoped to the
    # active Space), newest first.
    class NotificationsController < ApplicationController
      def index
        scope = current_user.notifications
        render json: {
          unread_count: scope.unread.count,
          notifications: NotificationBlueprint.render_as_hash(scope.newest_first.limit(50))
        }
      end

      def update
        notification = current_user.notifications.find(params[:id])
        notification.mark_read!
        render json: NotificationBlueprint.render(notification)
      end

      def read_all
        current_user.notifications.unread.update_all(read_at: Time.current)
        head :no_content
      end
    end
  end
end
