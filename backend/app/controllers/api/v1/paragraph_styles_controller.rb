module Api
  module V1
    # The signed-in person's own custom paragraph styles. They belong to the
    # person, not to a Space, so they are not scoped by X-Workspace-Id and any
    # signed-in user can keep their own list (changing it changes no Space). A
    # style is found only among the person's own, so another person's id is a 404.
    # Documents keep their own copy of the style's name and formatting (see
    # docs/features/paragraph_styles.md), so editing or deleting a style here
    # touches no document; the editor brings the documents it opens up to date.
    class ParagraphStylesController < ApplicationController
      before_action :set_style, only: [ :update, :destroy ]

      def index
        render json: ParagraphStyleBlueprint.render(current_user.paragraph_styles.order(:id))
      end

      def create
        style = current_user.paragraph_styles.build(style_params)
        if style.save
          render json: ParagraphStyleBlueprint.render(style), status: :created
        else
          render json: { errors: style.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @style.update(style_params)
          render json: ParagraphStyleBlueprint.render(@style)
        else
          render json: { errors: @style.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @style.destroy!
        head :no_content
      end

      private

      def set_style
        @style = current_user.paragraph_styles.find(params[:id])
      end

      # Formatting keys the model doesn't know are dropped here; their values
      # are checked by ParagraphStyle.
      def style_params
        params.require(:paragraph_style).permit(:name, :base, properties: ParagraphStyle::PROPERTY_KEYS.map(&:to_sym))
      end
    end
  end
end
