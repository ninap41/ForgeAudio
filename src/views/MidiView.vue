<template>
	<div class="midi-layout">
		<div class="midi-empty">
			<p class="midi-placeholder">MIDI view coming soon.</p>
		</div>
	</div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.midi-layout {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.midi-empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.midi-placeholder {
	color: var(--text-secondary);
	font-size: 14px;
}
</style>
