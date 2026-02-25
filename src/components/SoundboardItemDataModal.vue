<template>
	<BaseModal title="Soundboard Item Data" :max-width="'480px'" @close="$emit('close')">
		<div class="data-sections">
			<section class="data-section">
				<h4 class="section-title">Audio File</h4>
				<dl class="data-list">
					<div class="data-row">
						<dt>Filename</dt>
						<dd>{{ audioFile?.name ?? '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Path</dt>
						<dd class="data-path" :title="audioFile?.path">{{ audioFile?.path ?? '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Format</dt>
						<dd>{{ audioFile?.extension ?? '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Size</dt>
						<dd>{{ audioFile ? formatBytes(audioFile.size) : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Duration</dt>
						<dd>{{ audioFile?.duration != null ? formatDuration(audioFile.duration) : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Tags</dt>
						<dd>
							<span v-if="audioFile && audioFile.tags.length > 0" class="tag-list">
								<TagChip v-for="tag in audioFile.tags" :key="tag" :tag="tag" :removable="false" />
							</span>
							<span v-else>—</span>
						</dd>
					</div>
					<div class="data-row">
						<dt>Description</dt>
						<dd>{{ audioFile?.description || '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Created</dt>
						<dd>{{ audioFile?.createdAt ? formatDate(audioFile.createdAt) : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Modified</dt>
						<dd>{{ audioFile?.modifiedAt ? formatDate(audioFile.modifiedAt) : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Last Played</dt>
						<dd>{{ audioFile?.lastPlayed ? formatDate(audioFile.lastPlayed) : '—' }}</dd>
					</div>
				</dl>
			</section>

			<section class="data-section">
				<h4 class="section-title">Soundboard Item</h4>
				<dl class="data-list">
					<div class="data-row">
						<dt>Display Name</dt>
						<dd>{{ item?.name ?? '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Soundboard</dt>
						<dd>{{ soundboard?.name ?? '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Partial Playback</dt>
						<dd>{{ item?.partial ? 'Enabled' : 'Disabled' }}</dd>
					</div>
					<div class="data-row">
						<dt>Offset</dt>
						<dd>{{ item?.offset != null && item.offset > 0 ? item.offset + 's' : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Range</dt>
						<dd>{{ item?.range ? '[' + item.range[0] + 's, ' + item.range[1] + 's]' : '—' }}</dd>
					</div>
					<div class="data-row">
						<dt>Item Duration</dt>
						<dd>{{ item ? formatDuration(item.duration) : '—' }}</dd>
					</div>
				</dl>
			</section>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { computed } from "vue"
import BaseModal from "./BaseModal.vue"
import TagChip from "./TagChip.vue"
import { useLibraryStore } from "@/stores/libraryStore"
import { useSoundboardStore } from "@/stores/soundboardStore"
import { formatBytes } from "@/utils/formatBytes"

interface Props {
	soundboardId: string
	itemId: string
}

const props = defineProps<Props>()

defineEmits<{ close: [] }>()

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

const soundboard = computed(() =>
	soundboardStore.allSoundboards.find((sb) => sb.id === props.soundboardId),
)

const item = computed(() => soundboard.value?.items.find((i) => i.id === props.itemId))

const audioFile = computed(() => {
	if (!item.value) return null
	return library.files.find((f) => f.path === item.value!.filePath) ?? null
})

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}
</script>

<style scoped>
.data-sections {
	max-height: 60vh;
	overflow-y: auto;
	margin-bottom: 16px;
}

.data-section {
	margin-bottom: 16px;
}

.data-section:last-child {
	margin-bottom: 0;
}

.section-title {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.4px;
	color: var(--accent);
	margin-bottom: 8px;
	padding-bottom: 4px;
	border-bottom: 1px solid var(--border);
}

.data-list {
	margin: 0;
}

.data-row {
	display: flex;
	align-items: baseline;
	padding: 3px 0;
	font-size: 12px;
	gap: 8px;
}

.data-row dt {
	flex: 0 0 100px;
	color: var(--text-muted);
	font-weight: 500;
}

.data-row dd {
	flex: 1;
	margin: 0;
	color: var(--text-primary);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.data-path {
	font-family: monospace;
	font-size: 11px;
}

.tag-list {
	display: inline-flex;
	gap: 4px;
	flex-wrap: wrap;
}
</style>
