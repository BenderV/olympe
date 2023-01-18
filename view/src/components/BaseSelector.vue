<template>
  <select
    v-model="value"
    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
  >
    <option v-for="(option, ind) in options" :key="ind" :value="option">
      {{ option.public ? "(public) " : "" }}{{ option.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";

class BaseOption {
  name: string;
}

const props = defineProps({
  options: {
    // @ts-ignore
    type: Array as PropType<typeof BaseOption[]>,
    required: true,
  },
  modelValue: {
    // @ts-ignore
    type: Object as PropType<typeof BaseOption>,
    required: true,
  },
});

const emits = defineEmits(["update:modelValue"]);

const value = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});
</script>
