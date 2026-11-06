module Api
  module V1
    # The signed-in person's own custom paragraph styles. They belong to the
    # person, not to a Space, so they are not scoped by X-Workspace-Id and any
    # signed-in user can keep their own list (creating one changes no Space).
    class ParagraphStylesController < ApplicationController
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

      private

      # Formatting keys the model doesn't know are dropped here; their values
      # are checked by ParagraphStyle.
      def style_params
        params.require(:paragraph_style).permit(:name, :base, properties: ParagraphStyle::PROPERTY_KEYS.map(&:to_sym))
      end
    end
  end
end
