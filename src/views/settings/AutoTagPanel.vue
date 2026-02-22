<template>
	<section class="settings-section">
		<h3>Auto-Tagging Rules (STILL BEING IMPLEMENTED)</h3>
		<p class="panel-description">
			Create rules to automatically tag files based on their filename, a regex pattern, or file extension. Rules are
			previewed before applying so you can verify what will change. Tags are applied immediately and saved to your
			metadata.
		</p>

		<!-- Add Rule Form -->
		<div class="operation-card">
			<h4>Create Rule</h4>
			<div class="form-row">
				<div class="form-group">
					<label>Match Type</label>
					<select v-model="newRule.type" class="select-input">
						<option value="filename">Filename contains</option>
						<option value="regex">Regex pattern</option>
						<option value="extension">File extension</option>
					</select>
				</div>
				<div class="form-group flex-1">
					<label>Pattern</label>
					<input v-model="newRule.pattern" type="text" class="text-input" :placeholder="patternPlaceholder" />
				</div>
				<div class="form-group">
					<label>Tag to apply</label>
					<select v-model="newRule.tagName" class="select-input">
						<option value="">Select tag...</option>
						<option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
							{{ tag }}
						</option>
					</select>
				</div>
				<button class="btn btn-accent" :disabled="!canAddRule" @click="addRule">Add Rule</button>
			</div>
			<div v-if="patternError" class="error-message">{{ patternError }}</div>
		</div>

		<!-- Rules List -->
		<div v-if="rules.length > 0" class="rules-list">
			<div v-for="rule in rules" :key="rule.id" class="rule-row">
				<span class="rule-type">{{ ruleTypeLabel(rule.type) }}</span>
				<code class="rule-pattern">{{ rule.pattern }}</code>
				<span class="rule-arrow">&rarr;</span>
				<span class="rule-tag" :style="{ background: tagStore.getColor(rule.tagName), color: '#fff' }">
					{{ rule.tagName }}
				</span>
				<span class="rule-match-count">{{ matchCount(rule) }} matches</span>
				<button class="btn btn-subtle btn-sm" @click="removeRule(rule.id)">Remove</button>
			</div>
		</div>

		<!-- Preview & Apply -->
		<div v-if="rules.length > 0" class="preview-section">
			<div class="preview-header">
				<h4>Preview</h4>
				<span class="preview-summary">{{ totalMatches }} files will be tagged</span>
			</div>

			<div v-if="previewFiles.length > 0" class="preview-list">
				<div v-for="item in previewFiles.slice(0, 50)" :key="item.path" class="preview-row">
					<span class="preview-name">{{ item.name }}</span>
					<span v-for="tag in item.newTags" :key="tag" class="preview-tag" :style="{ background: tagStore.getColor(tag) }">
						+{{ tag }}
					</span>
				</div>
				<div v-if="previewFiles.length > 50" class="preview-more">...and {{ previewFiles.length - 50 }} more files</div>
			</div>

			<button class="btn btn-accent" :disabled="totalMatches === 0" @click="applyRules">
				Apply {{ totalMatches }} Tag{{ totalMatches !== 1 ? "s" : "" }}
			</button>
			<div v-if="applySuccess" class="success-message">Applied tags to {{ lastApplyCount }} files</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import { useTagStore } from "@/stores/tagStore"

interface AutoTagRule {
	id: string
	pattern: string
	tagName: string
	type: "filename" | "regex" | "extension"
}

interface PreviewItem {
	path: string
	name: string
	newTags: string[]
}

const library = useLibraryStore()
const tagStore = useTagStore()

const rules = ref<AutoTagRule[]>([])
const newRule = ref({ pattern: "", tagName: "", type: "filename" as "filename" | "regex" | "extension" })
const patternError = ref("")
const applySuccess = ref(false)
const lastApplyCount = ref(0)

const patternPlaceholder = computed(() => {
	switch (newRule.value.type) {
		case "filename":
			return "e.g. kick, snare, pad"
		case "regex":
			return "e.g. ^(kick|snare)_\\d+"
		case "extension":
			return "e.g. .wav, .mp3"
		default:
			return ""
	}
})

const canAddRule = computed(() => {
	return newRule.value.pattern.trim() && newRule.value.tagName
})

function addRule() {
	patternError.value = ""

	const pattern = newRule.value.pattern.trim()
	if (!pattern) return

	// Validate regex if type is regex
	if (newRule.value.type === "regex") {
		try {
			new RegExp(pattern, "i")
		} catch {
			patternError.value = "Invalid regex pattern"
			return
		}
	}

	rules.value.push({
		id: crypto.randomUUID(),
		pattern,
		tagName: newRule.value.tagName,
		type: newRule.value.type,
	})

	newRule.value.pattern = ""
	newRule.value.tagName = ""
}

function removeRule(id: string) {
	rules.value = rules.value.filter((r) => r.id !== id)
}

function ruleTypeLabel(type: string): string {
	switch (type) {
		case "filename":
			return "Name"
		case "regex":
			return "Regex"
		case "extension":
			return "Ext"
		default:
			return type
	}
}

function fileMatchesRule(file: { name: string; extension: string }, rule: AutoTagRule): boolean {
	switch (rule.type) {
		case "filename":
			return file.name.toLowerCase().includes(rule.pattern.toLowerCase())
		case "regex":
			try {
				return new RegExp(rule.pattern, "i").test(file.name)
			} catch {
				return false
			}
		case "extension":
			return file.extension.toLowerCase() === rule.pattern.toLowerCase()
		default:
			return false
	}
}

function matchCount(rule: AutoTagRule): number {
	return library.files.filter((f) => fileMatchesRule(f, rule) && !f.tags.includes(rule.tagName)).length
}

const previewFiles = computed<PreviewItem[]>(() => {
	const results: Map<string, PreviewItem> = new Map()

	for (const rule of rules.value) {
		for (const file of library.files) {
			if (fileMatchesRule(file, rule) && !file.tags.includes(rule.tagName)) {
				const existing = results.get(file.path)
				if (existing) {
					if (!existing.newTags.includes(rule.tagName)) {
						existing.newTags.push(rule.tagName)
					}
				} else {
					results.set(file.path, {
						path: file.path,
						name: file.name,
						newTags: [rule.tagName],
					})
				}
			}
		}
	}

	return Array.from(results.values())
})

const totalMatches = computed(() => previewFiles.value.length)

function applyRules() {
	applySuccess.value = false
	let count = 0

	for (const preview of previewFiles.value) {
		const file = library.files.find((f) => f.path === preview.path)
		if (file) {
			for (const tag of preview.newTags) {
				if (!file.tags.includes(tag)) {
					file.tags.push(tag)
					count++
				}
			}
		}
	}

	if (count > 0) {
		library.saveMetadata()
	}

	lastApplyCount.value = previewFiles.value.length
	applySuccess.value = true
	rules.value = []

	setTimeout(() => {
		applySuccess.value = false
	}, 3000)
}
</script>

<style scoped>
.settings-section {
	margin-bottom: 32px;
}

h3 {
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 16px;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.panel-description {
	font-size: 12px;
	line-height: 1.5;
	color: var(--text-muted);
	margin-bottom: 16px;
}

h4 {
	font-size: 12px;
	font-weight: 600;
	margin-bottom: 12px;
	color: var(--text-primary);
}

.operation-card {
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 12px;
	margin-bottom: 12px;
}

.form-row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	flex-wrap: wrap;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.flex-1 {
	flex: 1;
	min-width: 120px;
}

label {
	font-size: 11px;
	font-weight: 500;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.select-input,
.text-input {
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 6px 8px;
	color: var(--text-primary);
	font-size: 12px;
}

.select-input:focus,
.text-input:focus {
	outline: none;
	border-color: var(--accent);
}

.rules-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 16px;
}

.rule-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 4px;
	font-size: 12px;
}

.rule-type {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	color: var(--text-muted);
	min-width: 40px;
}

.rule-pattern {
	font-family: monospace;
	font-size: 11px;
	padding: 2px 6px;
	background: var(--bg-primary);
	border-radius: 2px;
	color: var(--accent);
}

.rule-arrow {
	color: var(--text-muted);
}

.rule-tag {
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 500;
}

.rule-match-count {
	margin-left: auto;
	font-size: 11px;
	color: var(--text-muted);
}

.preview-section {
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 12px;
}

.preview-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}

.preview-header h4 {
	margin-bottom: 0;
}

.preview-summary {
	font-size: 11px;
	color: var(--text-muted);
}

.preview-list {
	max-height: 200px;
	overflow-y: auto;
	margin-bottom: 12px;
}

.preview-row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 3px 0;
	font-size: 12px;
}

.preview-name {
	color: var(--text-secondary);
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.preview-tag {
	padding: 1px 6px;
	border-radius: 8px;
	font-size: 10px;
	color: #fff;
	font-weight: 500;
}

.preview-more {
	font-size: 11px;
	color: var(--text-muted);
	padding: 4px 0;
}

.btn {
	padding: 6px 12px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	color: var(--text-primary);
	cursor: pointer;
	transition: background 0.15s;
}

.btn:hover:not(:disabled) {
	background: var(--bg-hover);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-accent {
	background: var(--accent);
	border: none;
	color: white;
}

.btn-accent:hover:not(:disabled) {
	opacity: 0.9;
}

.btn-subtle {
	border-color: transparent;
	color: var(--text-secondary);
}

.btn-sm {
	padding: 3px 8px;
	font-size: 11px;
}

.error-message {
	font-size: 11px;
	color: var(--danger, #ff4d4d);
	padding: 4px 8px;
	background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
	border-radius: 4px;
	margin-top: 8px;
}

.success-message {
	font-size: 11px;
	color: var(--success, #4dff4d);
	padding: 4px 8px;
	background: color-mix(in srgb, var(--success, #4dff4d) 10%, transparent);
	border-radius: 4px;
	margin-top: 8px;
}
</style>
