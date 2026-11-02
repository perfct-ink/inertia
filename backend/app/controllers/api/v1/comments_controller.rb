module Api
  module V1
    # Comments ("Updates") on tasks, epics, initiatives and milestones. Everything is
    # scoped to the current workspace; viewers can read, members and above can
    # write (WorkspaceScoped). Only the author edits a comment, and the author or
    # a workspace admin/owner deletes it.
    class CommentsController < ApplicationController
      include WorkspaceScoped
      before_action :set_comment, only: [ :update, :destroy ]
      before_action :require_author!, only: :update
      before_action :require_author_or_manager!, only: :destroy

      # The whole conversation on one item, oldest first. Replies come with a
      # parent_id; the client nests them.
      def index
        item = find_commentable(params[:commentable_type], params[:commentable_id])
        comments = item.comments.includes(:author, :mentioned_users).order(:created_at, :id)
        render json: CommentBlueprint.render(comments)
      end

      def create
        item = find_commentable(create_params[:commentable_type], create_params[:commentable_id])
        comment = current_workspace.comments.build(commentable: item, author: current_user, body: create_params[:body])
        comment.parent = current_workspace.comments.find(create_params[:parent_id]) if create_params[:parent_id].present?
        if comment.save_with_mentions(create_params[:mentioned_user_ids])
          render json: CommentBlueprint.render(comment), status: :created
        else
          render json: { errors: comment.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        @comment.body = update_params[:body]
        # Leaving the list out keeps the existing mentions that the text still names.
        mentioned = update_params.key?(:mentioned_user_ids) ? update_params[:mentioned_user_ids] : @comment.mentioned_user_ids
        if @comment.save_with_mentions(mentioned)
          render json: CommentBlueprint.render(@comment)
        else
          render json: { errors: @comment.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Replies go with the comment they answer.
      def destroy
        @comment.destroy
        head :no_content
      end

      private

      def set_comment
        @comment = current_workspace.comments.find(params[:id])
      end

      def require_author!
        raise Pundit::NotAuthorizedError unless @comment.author_id == current_user.id
      end

      def require_author_or_manager!
        return if @comment.author_id == current_user.id
        require_manage_in!(current_workspace.id)
      end

      # Looks the item up through the workspace, by an allow-listed type, so
      # another space's item (or an unknown type) is "not found".
      def find_commentable(type, id)
        association = Comment::COMMENTABLES.fetch(type.to_s) { raise ActiveRecord::RecordNotFound }
        current_workspace.public_send(association).find(id)
      end

      def create_params
        params.require(:comment).permit(:commentable_type, :commentable_id, :parent_id, :body, mentioned_user_ids: [])
      end

      def update_params
        params.require(:comment).permit(:body, mentioned_user_ids: [])
      end
    end
  end
end
