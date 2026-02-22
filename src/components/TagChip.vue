<template>
	<span
		class="tag-chip"
		:style="{ backgroundColor: color + '22', color: color, borderColor: color + '44' }"
		@click="$emit('click')"
	>
		{{ tag }}
		<button v-if="removable" class="remove-btn" @click.stop="$emit('remove')">&times;</button>
	</span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useTagStore } from "@/stores/tagStore"

const props = defineProps<{
	tag: string
	removable?: boolean
}>()

defineEmits<{
	click: []
	remove: []
}>()

const tagStore = useTagStore()
const color = computed(() => tagStore.getColor(props.tag) || "gray")
</script>

<style>
.tag-chip {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 1px 7px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 500;
	border: 1px solid;
	cursor: pointer;
	white-space: nowrap;
	transition: filter 0.15s;
}

.tag-chip:hover {
	filter: brightness(1.2);
}

.remove-btn {
	font-size: 13px;
	line-height: 1;
	margin-left: 1px;
	color: inherit;
	opacity: 0.6;
}

.remove-btn:hover {
	opacity: 1;
}
</style>
