<template>
	<BaseModal :title="modalTitle" maxWidth="400px" @close="$emit('close')">
		<div class="modal-body">
			<label class="field-label">Month</label>
			<input
				ref="monthInputRef"
				v-model="monthInput"
				class="modal-input"
				type="text"
				list="month-list"
				placeholder="e.g. February"
				@input="clearError"
			/>
			<datalist id="month-list">
				<option v-for="m in MONTHS" :key="m" :value="m" />
			</datalist>

			<label class="field-label">Day</label>
			<input
				v-model="dayRaw"
				class="modal-input"
				type="text"
				inputmode="numeric"
				placeholder="e.g. 3"
				@input="clearError"
			/>

			<label class="field-label">Year</label>
			<input
				v-model="yearRaw"
				class="modal-input"
				type="text"
				inputmode="numeric"
				placeholder="e.g. 2025"
				@input="clearError"
			/>

			<p v-if="error" class="modal-error">{{ error }}</p>
		</div>

		<template #actions>
			<button class="btn" @click="$emit('close')">Cancel</button>
			<button class="btn btn-accent" :disabled="!isValid" @click="onApply">Apply</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import BaseModal from "@/components/BaseModal.vue"
import { useLibraryStore, type DateFilter } from "@/stores/libraryStore"
import { MONTHS } from "@/utils/formatDateOrdinal"

interface Props {
	field: "createdAt" | "modifiedAt"
	operator: "on" | "before" | "after"
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const monthInputRef = ref<HTMLInputElement>()

const monthInput = ref("")
const dayRaw = ref("")
const yearRaw = ref(String(new Date().getFullYear()))
const error = ref("")

const dayInput = computed(() => {
	const n = parseInt(dayRaw.value, 10)
	return isNaN(n) ? null : n
})

const yearInput = computed(() => {
	const n = parseInt(yearRaw.value, 10)
	return isNaN(n) ? null : n
})

const fieldLabel = computed(() => (props.field === "createdAt" ? "created" : "modified"))
const modalTitle = computed(() => `Filter: ${fieldLabel.value} ${props.operator}`)

const resolvedMonthIndex = computed(() => {
	const q = monthInput.value.trim().toLowerCase()
	if (!q) return -1
	return MONTHS.findIndex((m) => m.toLowerCase() === q)
})

function daysInMonth(month: number, year: number): number {
	return new Date(year, month + 1, 0).getDate()
}

const isValid = computed(() => {
	if (resolvedMonthIndex.value < 0) return false
	if (dayInput.value === null || dayInput.value < 1) return false
	if (!yearInput.value || yearInput.value < 1970 || yearInput.value > 2100) return false
	const maxDays = daysInMonth(resolvedMonthIndex.value, yearInput.value)
	if (dayInput.value > maxDays) return false
	return true
})

function clearError() {
	error.value = ""
}

function onApply() {
	if (!isValid.value) {
		error.value = "Please enter a valid date"
		return
	}

	const date = new Date(Date.UTC(yearInput.value!, resolvedMonthIndex.value, dayInput.value!))

	const filter: DateFilter = {
		id: `df_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		field: props.field,
		operator: props.operator,
		date: date.toISOString(),
	}

	library.addDateFilter(filter)
	emit("close")
}
</script>
