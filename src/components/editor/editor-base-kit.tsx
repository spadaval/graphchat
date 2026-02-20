import { BaseAlignKit } from "~/components/editor/align-base-kit";
import { BaseBasicBlocksKit } from "~/components/editor/basic-blocks-base-kit";
import { BaseBasicMarksKit } from "~/components/editor/basic-marks-base-kit";
import { BaseCalloutKit } from "~/components/editor/callout-base-kit";
import { BaseCodeBlockKit } from "~/components/editor/code-block-base-kit";
import { BaseColumnKit } from "~/components/editor/column-base-kit";
import { BaseCommentKit } from "~/components/editor/comment-base-kit";
import { BaseDateKit } from "~/components/editor/date-base-kit";
import { BaseFontKit } from "~/components/editor/font-base-kit";
import { BaseLineHeightKit } from "~/components/editor/line-height-base-kit";
import { BaseLinkKit } from "~/components/editor/link-base-kit";
import { BaseListKit } from "~/components/editor/list-base-kit";
import { MarkdownKit } from "~/components/editor/markdown-kit";
import { BaseMathKit } from "~/components/editor/math-base-kit";
import { BaseMediaKit } from "~/components/editor/media-base-kit";
import { BaseMentionKit } from "~/components/editor/mention-base-kit";
import { BaseSuggestionKit } from "~/components/editor/suggestion-base-kit";
import { BaseTableKit } from "~/components/editor/table-base-kit";
import { BaseTocKit } from "~/components/editor/toc-base-kit";
import { BaseToggleKit } from "~/components/editor/toggle-base-kit";

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
];
