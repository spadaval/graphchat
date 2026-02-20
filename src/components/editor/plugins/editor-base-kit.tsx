import { BaseAlignKit } from "~/components/editor/plugins/align-base-kit";
import { BaseBasicBlocksKit } from "~/components/editor/plugins/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "~/components/editor/plugins/basic-marks-base-kit";
import { BaseCalloutKit } from "~/components/editor/plugins/callout-base-kit";
import { BaseCodeBlockKit } from "~/components/editor/plugins/code-block-base-kit";
import { BaseColumnKit } from "~/components/editor/plugins/column-base-kit";
import { BaseCommentKit } from "~/components/editor/plugins/comment-base-kit";
import { BaseDateKit } from "~/components/editor/plugins/date-base-kit";
import { BaseFontKit } from "~/components/editor/plugins/font-base-kit";
import { BaseLineHeightKit } from "~/components/editor/plugins/line-height-base-kit";
import { BaseLinkKit } from "~/components/editor/plugins/link-base-kit";
import { BaseListKit } from "~/components/editor/plugins/list-base-kit";
import { MarkdownKit } from "~/components/editor/plugins/markdown-kit";
import { BaseMathKit } from "~/components/editor/plugins/math-base-kit";
import { BaseMediaKit } from "~/components/editor/plugins/media-base-kit";
import { BaseMentionKit } from "~/components/editor/plugins/mention-base-kit";
import { BaseSuggestionKit } from "~/components/editor/plugins/suggestion-base-kit";
import { BaseTableKit } from "~/components/editor/plugins/table-base-kit";
import { BaseTocKit } from "~/components/editor/plugins/toc-base-kit";
import { BaseToggleKit } from "~/components/editor/plugins/toggle-base-kit";
import { DndKit } from "./dnd-kit";

export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseCodeBlockKit,
  ...BaseTableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseMediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...BaseLinkKit,
  ...BaseMentionKit,
  ...BaseBasicMarksKit,
  ...BaseFontKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...BaseCommentKit,
  ...BaseSuggestionKit,
  ...MarkdownKit,
  ...DndKit,
];
