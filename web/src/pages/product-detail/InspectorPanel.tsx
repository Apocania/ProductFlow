import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  OctagonX,
  Play,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

import { ImageDropZone } from "../../components/ImageDropZone";
import { ImageGenerationSettingsPanel } from "../../components/ImageGenerationSettingsPanel";
import { ImageGenerationSettingsTabs, type ImageGenerationSettingsTab } from "../../components/ImageGenerationSettingsTabs";
import { ImageToolControls } from "../../components/ImageToolControls";
import { PromptPreviewDialog, type PromptPreview } from "../../components/PromptPreviewDialog";
import type { DownloadableImage } from "../../lib/image-downloads";
import type { ImageSizeOption } from "../../lib/imageSizes";
import { formatDateTime, formatPrice } from "../../lib/format";
import type {
  CopyBlock,
  CopyPayloadV2,
  CopySection,
  ImageToolOptionKey,
  ProductDetail,
  ProductWorkflow,
  WorkflowNode,
} from "../../lib/types";
import { IMAGE_PREVIEW_SURFACE_CLASS_NAME, NODE_LABELS } from "./constants";
import { DownloadLink } from "./ImageDownloadComponents";
import { getNodeImageDownload } from "./imageDownloads";
import type { NodeConfigDraft, SaveStatus } from "./types";
import { type WorkflowNodeRunActionState, outputText, statusClass, workflowNodeStatusLabel } from "./utils";
import { TextArea } from "./TextArea";

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle: "自动保存",
  saving: "保存中",
  saved: "已保存",
  failed: "保存失败",
};

const SAVE_STATUS_CLASS_NAMES: Record<SaveStatus, string> = {
  idle: "border-zinc-200 bg-zinc-50 text-zinc-500",
  saving: "border-blue-200 bg-blue-50 text-blue-700",
  saved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const ADD_COPY_FIELD_BUTTON_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700";

interface InspectorPanelProps {
  product: ProductDetail;
  sourceImage: DownloadableImage | null;
  workflow: ProductWorkflow | null;
  node: WorkflowNode;
  draft: NodeConfigDraft;
  imageSizeOptions: ImageSizeOption[];
  imageGenerationMaxDimension: number;
  imageToolAllowedFields: readonly ImageToolOptionKey[];
  onDraftChange: (draft: NodeConfigDraft) => void;
  onPreviewImage: (image: DownloadableImage) => void;
  onRun: () => void;
  onCancelRun: (() => void) | null;
  onUploadImage: (file: File) => void;
  onDelete: () => void;
  busy: boolean;
  cancelBusy: boolean;
  runActionState: WorkflowNodeRunActionState;
  saveStatus: SaveStatus;
}

export function InspectorPanel({
  product,
  sourceImage,
  workflow,
  node,
  draft,
  imageSizeOptions,
  imageGenerationMaxDimension,
  imageToolAllowedFields,
  onDraftChange,
  onPreviewImage,
  onRun,
  onCancelRun,
  onUploadImage,
  onDelete,
  busy,
  cancelBusy,
  runActionState,
  saveStatus,
}: InspectorPanelProps) {
  const [promptPreview, setPromptPreview] = useState<PromptPreview | null>(null);
  const icon = {
    product_context: FileText,
    reference_image: ImagePlus,
    copy_generation: FileText,
    image_generation: ImageIcon,
  }[node.node_type];
  const InspectorIcon = icon;
  const downstreamReferenceCount =
    node.node_type === "image_generation"
      ? new Set(
          workflow?.edges
            .filter((edge) => {
              if (edge.source_node_id !== node.id) {
                return false;
              }
              const target = workflow.nodes.find(
                (item) => item.id === edge.target_node_id,
              );
              return target?.node_type === "reference_image";
            })
            .map((edge) => edge.target_node_id) ?? [],
        ).size
      : 0;
  const hasReferenceImage = Boolean(
    node.node_type === "reference_image" &&
      Array.isArray(node.output_json?.source_asset_ids) &&
      node.output_json.source_asset_ids.length,
  );
  const referenceImage = node.node_type === "reference_image" ? getNodeImageDownload(node, product) : null;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="flex items-start gap-3">
          <span className="rounded-xl border border-indigo-100 bg-indigo-50 p-2 text-indigo-700">
            <InspectorIcon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-zinc-950">
              {draft.title || node.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                {NODE_LABELS[node.node_type]}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(node.status)}`}
              >
                {node.status === "running" || node.status === "queued" ? (
                  <Loader2 size={11} className="mr-1 animate-spin" />
                ) : node.status === "failed" ? (
                  <XCircle size={11} className="mr-1" />
                ) : node.status === "succeeded" ? (
                  <CheckCircle2 size={11} className="mr-1" />
                ) : (
                  <Clock3 size={11} className="mr-1" />
                )}
                {workflowNodeStatusLabel(node)}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SAVE_STATUS_CLASS_NAMES[saveStatus]}`}
              >
                {saveStatus === "saving" ? (
                  <Loader2 size={11} className="mr-1 animate-spin" />
                ) : saveStatus === "saved" ? (
                  <CheckCircle2 size={11} className="mr-1" />
                ) : saveStatus === "failed" ? (
                  <XCircle size={11} className="mr-1" />
                ) : null}
                {SAVE_STATUS_LABELS[saveStatus]}
              </span>
            </div>
            {node.last_run_at ? (
              <div className="mt-2 text-[11px] text-zinc-400">
                最近 {formatDateTime(node.last_run_at)}
              </div>
            ) : null}
          </div>
        </div>

        {node.node_type !== "product_context" || onCancelRun ? (
          <div
            className={`mt-4 grid gap-2 ${
              node.node_type === "product_context" ? "grid-cols-1" : onCancelRun ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {node.node_type !== "product_context" ? (
              <button
                type="button"
                onClick={onRun}
                disabled={runActionState.disabled}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                title={runActionState.title}
              >
                {runActionState.pending ? (
                  <Loader2 size={13} className="mr-1.5 animate-spin" />
                ) : (
                  <Play size={13} className="mr-1.5" />
                )}
                {runActionState.label}
              </button>
            ) : null}
            {onCancelRun ? (
              <button
                type="button"
                onClick={onCancelRun}
                disabled={cancelBusy}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                title="取消包含该节点的当前运行"
              >
                {cancelBusy ? (
                  <Loader2 size={13} className="mr-1.5 animate-spin" />
                ) : (
                  <OctagonX size={13} className="mr-1.5" />
                )}
                取消
              </button>
            ) : null}
            {node.node_type !== "product_context" ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} className="mr-1.5" /> 删除
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          配置
        </div>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            节点名称
          </span>
          <input
            value={draft.title}
            onChange={(event) =>
              onDraftChange({ ...draft, title: event.target.value })
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </label>

        {node.node_type === "product_context" ? (
          <ProductContextInspector
            product={product}
            sourceImage={sourceImage}
            draft={draft}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {node.node_type === "reference_image" ? (
          <ReferenceImageInspector
            draft={draft}
            onDraftChange={onDraftChange}
            onUploadImage={onUploadImage}
            busy={busy}
            hasImage={hasReferenceImage}
            image={referenceImage}
            onPreviewImage={onPreviewImage}
          />
        ) : null}
        {node.node_type === "copy_generation" ? (
          <CopyNodeInspector
            node={node}
            draft={draft}
            onDraftChange={onDraftChange}
          />
        ) : null}
        {node.node_type === "image_generation" ? (
          <ImageGenerationInspector
            node={node}
            draft={draft}
            imageSizeOptions={imageSizeOptions}
            imageGenerationMaxDimension={imageGenerationMaxDimension}
            imageToolAllowedFields={imageToolAllowedFields}
            onDraftChange={onDraftChange}
            downstreamReferenceCount={downstreamReferenceCount}
            onPreviewPrompt={setPromptPreview}
          />
        ) : null}
      </section>
      {node.failure_reason ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-700 shadow-sm">
          <AlertCircle size={13} className="mr-1.5 inline" />
          {node.failure_reason}
        </section>
      ) : null}
      {promptPreview ? (
        <PromptPreviewDialog preview={promptPreview} onClose={() => setPromptPreview(null)} />
      ) : null}
    </div>
  );
}

function ProductContextInspector({
  product,
  sourceImage,
  draft,
  onDraftChange,
}: {
  product: ProductDetail;
  sourceImage: DownloadableImage | null;
  draft: NodeConfigDraft;
  onDraftChange: (draft: NodeConfigDraft) => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className={`relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 p-2 ${IMAGE_PREVIEW_SURFACE_CLASS_NAME}`}
      >
        {sourceImage ? (
          <>
            <img
              src={sourceImage.previewUrl}
              alt={sourceImage.alt}
              className="h-full w-full object-contain"
            />
            <DownloadLink image={sourceImage} variant="overlay" />
          </>
        ) : (
          <div className="text-xs text-zinc-400">暂无商品源图</div>
        )}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          商品名称
        </span>
        <input
          value={draft.productName}
          onChange={(event) =>
            onDraftChange({ ...draft, productName: event.target.value })
          }
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            类目
          </span>
          <input
            value={draft.category}
            onChange={(event) =>
              onDraftChange({ ...draft, category: event.target.value })
            }
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            价格
          </span>
          <input
            value={draft.price}
            onChange={(event) =>
              onDraftChange({ ...draft, price: event.target.value })
            }
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </label>
      </div>
      <TextArea
        label="商品描述"
        value={draft.sourceNote}
        onChange={(value) => onDraftChange({ ...draft, sourceNote: value })}
      />
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        原始商品：{product.name}
        {product.category ? ` · ${product.category}` : ""}
        {product.price ? ` · ${formatPrice(product.price)}` : ""}
      </div>
    </div>
  );
}

function ReferenceImageInspector({
  draft,
  onDraftChange,
  onUploadImage,
  busy,
  hasImage,
  image,
  onPreviewImage,
}: {
  draft: NodeConfigDraft;
  onDraftChange: (draft: NodeConfigDraft) => void;
  onUploadImage: (file: File) => void;
  busy: boolean;
  hasImage: boolean;
  image: DownloadableImage | null;
  onPreviewImage: (image: DownloadableImage) => void;
}) {
  return (
    <div className="space-y-3">
      {image ? (
        <div
          className={`group relative flex aspect-[4/3] min-h-[180px] w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 p-3 transition-colors hover:border-indigo-300 ${IMAGE_PREVIEW_SURFACE_CLASS_NAME}`}
        >
          <button
            type="button"
            onClick={() => onPreviewImage(image)}
            className="flex h-full w-full items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label={`预览 ${image.alt}`}
          >
            <img src={image.previewUrl} alt={image.alt} className="h-full w-full object-contain" />
            <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-zinc-950/70 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              点击预览
            </span>
          </button>
          <DownloadLink image={image} variant="overlay" />
        </div>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          标签
        </span>
        <input
          value={draft.label}
          onChange={(event) =>
            onDraftChange({ ...draft, label: event.target.value })
          }
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          角色
        </span>
        <select
          value={draft.role}
          onChange={(event) =>
            onDraftChange({ ...draft, role: event.target.value })
          }
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        >
          <option value="reference">参考图</option>
          <option value="style">风格图</option>
          <option value="product_angle">商品角度</option>
        </select>
      </label>
      <ImageDropZone
        ariaLabel={hasImage ? "替换参考图" : "上传参考图"}
        disabled={busy}
        className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 px-3 py-6 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        onFiles={(files) => {
          const file = files[0];
          if (file) {
            onUploadImage(file);
          }
        }}
      >
        {({ isDragging }) => (
          <>
            <Upload size={14} className="mr-2" />
            {isDragging ? "松开以上传图片" : hasImage ? "拖拽或点击替换图片" : "拖拽或点击上传图片"}
          </>
        )}
      </ImageDropZone>
    </div>
  );
}

function CopyNodeInspector({
  node,
  draft,
  onDraftChange,
}: {
  node: WorkflowNode;
  draft: NodeConfigDraft;
  onDraftChange: (draft: NodeConfigDraft) => void;
}) {
  const hasCopy = Boolean(
    node.output_json && outputText(node.output_json, "copy_set_id"),
  );
  const copyPayload = draft.copyStructuredPayload;
  return (
    <div className="space-y-3">
      <TextArea
        label="文案指令"
        value={draft.instruction}
        onChange={(value) => onDraftChange({ ...draft, instruction: value })}
      />
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          语气
        </span>
        <input
          value={draft.tone}
          onChange={(event) =>
            onDraftChange({ ...draft, tone: event.target.value })
          }
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          渠道
        </span>
        <input
          value={draft.channel}
          onChange={(event) =>
            onDraftChange({ ...draft, channel: event.target.value })
          }
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      {hasCopy ? (
        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            编辑文案
          </div>
          {copyPayload ? (
            <StructuredCopyEditor
              payload={copyPayload}
              onChange={(copyStructuredPayload) => onDraftChange({ ...draft, copyStructuredPayload })}
            />
          ) : null}
          <DerivedCopyFields draft={draft} />
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] leading-5 text-zinc-500">
            文案编辑会自动保存；运行前也会先同步当前草稿。
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StructuredCopyEditor({
  payload,
  onChange,
}: {
  payload: CopyPayloadV2;
  onChange: (payload: CopyPayloadV2) => void;
}) {
  const content = payload.content;
  return (
    <div className="space-y-3">
      <TextArea
        label="摘要"
        value={payload.summary}
        onChange={(summary) => onChange({ ...payload, summary })}
        minRows={1}
        maxRows={6}
      />
      {content.kind === "freeform" ? (
        <TextArea
          label="正文"
          value={content.text}
          onChange={(text) => onChange({ ...payload, content: { kind: "freeform", text } })}
          minRows={3}
          maxRows={18}
        />
      ) : null}
      {content.kind === "blocks" ? (
        <div className="space-y-2">
          {content.blocks.map((block, index) => (
            <CopyBlockEditor
              key={block.id}
              block={block}
              onChange={(nextBlock) => {
                const blocks = [...content.blocks];
                blocks[index] = nextBlock;
                onChange({ ...payload, content: { kind: "blocks", blocks } });
              }}
            />
          ))}
        </div>
      ) : null}
      {content.kind === "layout_brief" ? (
        <div className="space-y-2">
          {content.sections.map((section, index) => (
            <CopySectionEditor
              key={section.id}
              section={section}
              onChange={(nextSection) => {
                const sections = [...content.sections];
                sections[index] = nextSection;
                onChange({ ...payload, content: { kind: "layout_brief", sections } });
              }}
            />
          ))}
        </div>
      ) : null}
      <OptionalTextArea
        label="视觉建议"
        value={payload.visual_guidance?.composition_hint ?? ""}
        addLabel="添加视觉建议"
        placeholder="补充画面构图、文字层级、留白等建议"
        onChange={(composition_hint) =>
          onChange({
            ...payload,
            visual_guidance: {
              main_message: payload.visual_guidance?.main_message ?? "",
              hierarchy: payload.visual_guidance?.hierarchy ?? [],
              composition_hint,
              text_density: payload.visual_guidance?.text_density ?? "medium",
              avoid: payload.visual_guidance?.avoid ?? [],
            },
          })
        }
      />
    </div>
  );
}

function CopyBlockEditor({ block, onChange }: { block: CopyBlock; onChange: (block: CopyBlock) => void }) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-3">
      <OptionalTextInput
        label="标签"
        value={block.label ?? ""}
        addLabel="添加标签"
        placeholder="标签"
        onChange={(label) => onChange({ ...block, label })}
      />
      <TextArea
        label="正文"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        minRows={1}
        maxRows={12}
      />
      <OptionalTextArea
        label="视觉表达"
        value={block.visual_hint ?? ""}
        addLabel="添加视觉表达"
        placeholder="补充适合的图标、构图或标注方式"
        onChange={(visual_hint) => onChange({ ...block, visual_hint })}
      />
    </div>
  );
}

function CopySectionEditor({ section, onChange }: { section: CopySection; onChange: (section: CopySection) => void }) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-3">
      <OptionalTextInput
        label="分区标题"
        value={section.title ?? ""}
        addLabel="添加分区标题"
        placeholder="分区标题"
        onChange={(title) => onChange({ ...section, title })}
      />
      <OptionalTextArea
        label="说明"
        value={section.body ?? ""}
        addLabel="添加说明"
        placeholder="补充该分区承载的文案或画面说明"
        onChange={(body) => onChange({ ...section, body })}
      />
      {section.items.length ? (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            条目
          </div>
          <div className="space-y-1.5">
            {section.items.map((item, index) => (
              <CopySectionItemEditor
                key={item.id}
                block={item}
                onChange={(nextItem) => {
                  const items = [...section.items];
                  items[index] = nextItem;
                  onChange({ ...section, items });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <OptionalTextArea
        label="视觉建议"
        value={section.visual_hint ?? ""}
        addLabel="添加视觉建议"
        placeholder="补充该分区的构图、位置或视觉标注"
        onChange={(visual_hint) => onChange({ ...section, visual_hint })}
      />
    </div>
  );
}

function CopySectionItemEditor({ block, onChange }: { block: CopyBlock; onChange: (block: CopyBlock) => void }) {
  return (
    <div className="space-y-1.5 border-l border-zinc-200 pl-2.5">
      <OptionalTextInput
        label="标签"
        value={block.label ?? ""}
        addLabel="添加标签"
        placeholder="标签"
        onChange={(label) => onChange({ ...block, label })}
      />
      <TextArea
        label="正文"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        minRows={1}
        maxRows={8}
      />
      <OptionalTextArea
        label="视觉表达"
        value={block.visual_hint ?? ""}
        addLabel="添加视觉表达"
        placeholder="补充这个条目的视觉表达"
        onChange={(visual_hint) => onChange({ ...block, visual_hint })}
      />
    </div>
  );
}

function OptionalTextInput({
  label,
  value,
  addLabel,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  addLabel: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(hasText(value));
  const shouldShowInput = isEditing || hasText(value);

  if (!shouldShowInput) {
    return (
      <button
        type="button"
        className={ADD_COPY_FIELD_BUTTON_CLASS_NAME}
        onClick={() => setIsEditing(true)}
      >
        <Plus size={12} />
        {addLabel}
      </button>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (!hasText(value)) {
            setIsEditing(false);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
      />
    </label>
  );
}

function OptionalTextArea({
  label,
  value,
  addLabel,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  addLabel: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(hasText(value));
  const shouldShowTextArea = isEditing || hasText(value);

  if (!shouldShowTextArea) {
    return (
      <button
        type="button"
        className={ADD_COPY_FIELD_BUTTON_CLASS_NAME}
        onClick={() => setIsEditing(true)}
      >
        <Plus size={12} />
        {addLabel}
      </button>
    );
  }

  return (
    <TextArea
      label={label}
      value={value}
      onChange={onChange}
      onBlur={() => {
        if (!hasText(value)) {
          setIsEditing(false);
        }
      }}
      minRows={1}
      maxRows={12}
      placeholder={placeholder}
    />
  );
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function DerivedCopyFields({ draft }: { draft: NodeConfigDraft }) {
  const points = draft.copySellingPoints.split("\n").filter(Boolean);
  return (
    <div className="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-2 text-[11px] leading-5 text-zinc-500">
      <div className="mb-1 font-semibold text-zinc-600">派生字段</div>
      <div>标题：{draft.copyTitle || "未派生"}</div>
      <div>卖点：{points.length ? points.join(" / ") : "未派生"}</div>
      <div>海报标题：{draft.copyPosterHeadline || "未派生"}</div>
      <div>CTA：{draft.copyCta || "未派生"}</div>
    </div>
  );
}

function ImageGenerationInspector({
  node,
  draft,
  imageSizeOptions,
  imageGenerationMaxDimension,
  imageToolAllowedFields,
  onDraftChange,
  downstreamReferenceCount,
  onPreviewPrompt,
}: {
  node: WorkflowNode;
  draft: NodeConfigDraft;
  imageSizeOptions: ImageSizeOption[];
  imageGenerationMaxDimension: number;
  imageToolAllowedFields: readonly ImageToolOptionKey[];
  onDraftChange: (draft: NodeConfigDraft) => void;
  downstreamReferenceCount: number;
  onPreviewPrompt: (preview: PromptPreview) => void;
}) {
  const [settingsTab, setSettingsTab] = useState<ImageGenerationSettingsTab>("basic");
  const savedInstruction = node.output_json ? outputText(node.output_json, "instruction") : "";
  const previewText = savedInstruction || draft.instruction;
  const promptMeta = savedInstruction ? "最近一次运行保存的生图指令" : "当前草稿";

  return (
    <div className="space-y-3">
      {downstreamReferenceCount === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          请先连接一个参考图节点，生成结果会写入该节点。
        </div>
      ) : null}
      <ImageGenerationSettingsTabs
        value={settingsTab}
        onChange={setSettingsTab}
        basic={
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">生成数量</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-500">
                    由下游参考图节点决定；当前会生成 {downstreamReferenceCount} 张。
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {downstreamReferenceCount} 张
                </span>
              </div>
            </div>
            <TextArea
              label="画面描述"
              value={draft.instruction}
              onChange={(value) => onDraftChange({ ...draft, instruction: value })}
            />
            {previewText.trim() ? (
              <button
                type="button"
                onClick={() =>
                  onPreviewPrompt({
                    title: "生图 Prompt",
                    text: previewText,
                    meta: promptMeta,
                  })
                }
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950"
              >
                <FileText size={13} className="mr-1.5" />
                回看完整 Prompt
              </button>
            ) : null}
            <ImageGenerationSettingsPanel
              surface="plain"
              size={draft.size}
              sizeOptions={imageSizeOptions}
              maxDimension={imageGenerationMaxDimension}
              toolOptions={draft.toolOptions}
              allowedToolFields={imageToolAllowedFields}
              onSizeChange={(size) => onDraftChange({ ...draft, size })}
              onToolOptionsChange={(toolOptions) => onDraftChange({ ...draft, toolOptions })}
              showToolOptions={false}
            />
          </div>
        }
        advanced={
          <ImageToolControls
            surface="plain"
            value={draft.toolOptions}
            allowedFields={imageToolAllowedFields}
            onChange={(toolOptions) => onDraftChange({ ...draft, toolOptions })}
          />
        }
      />
    </div>
  );
}
