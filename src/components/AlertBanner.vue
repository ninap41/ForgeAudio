<template>
	<Transition name="alert-slide" @after-leave="$emit('dismiss')">
		<div v-if="visible" class="alert-banner" :class="`alert-${type}`" role="alert">
			<div class="alert-content">
				<span class="alert-message">{{ message }}</span>
				<span v-if="details" class="alert-details">{{ details }}</span>
			</div>
			<button
				v-if="dismissible"
				class="alert-dismiss"
				aria-label="Dismiss alert"
				@click="visible = false"
			>
				&times;
			</button>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"

interface Props {
	type: "info" | "success" | "warning" | "error"
	message: string
	details?: string
	duration?: number
	dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	duration: 5000,
	dismissible: true,
})

defineEmits<{
	dismiss: []
}>()

const visible = ref(true)
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
	if (props.duration > 0) {
		timer = setTimeout(() => {
			visible.value = false
		}, props.duration)
	}
})

onBeforeUnmount(() => {
	if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.alert-banner {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 50;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	font-size: 12px;
	border-left: 3px solid var(--alert-color);
	border-bottom: 1px solid color-mix(in srgb, var(--alert-color) 30%, var(--border));
	background: color-mix(in srgb, var(--alert-color) 12%, var(--bg-secondary));
}

.alert-success {
	--alert-color: var(--success);
}

.alert-error {
	--alert-color: var(--danger);
}

.alert-info {
	--alert-color: var(--accent);
}

.alert-warning {
	--alert-color: #f0a830;
}

.alert-content {
	display: flex;
	align-items: baseline;
	gap: 8px;
	min-width: 0;
}

.alert-message {
	color: var(--text-primary);
	font-weight: 500;
}

.alert-details {
	color: var(--text-muted);
	font-size: 11px;
}

.alert-dismiss {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 3px;
	color: var(--text-secondary);
	font-size: 16px;
	line-height: 1;
	cursor: pointer;
	transition: background 0.15s, color 0.15s;
}

.alert-dismiss:hover {
	background: var(--bg-hover);
	color: var(--text-primary);
}

.alert-slide-enter-active {
	transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.alert-slide-leave-active {
	transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}

.alert-slide-enter-from,
.alert-slide-leave-to {
	transform: translateY(-100%);
	opacity: 0;
}
</style>
