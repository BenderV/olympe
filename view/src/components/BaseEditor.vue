<template>
  <v-ace-editor
    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md pb-32"
    v-model:value="inputText"
    lang="sql"
    mode="sql"
    theme="monokai"
    :min-lines="3"
    :max-lines="10"
    @keydown.enter.meta.exact="runQuery"
    placeholder="SELECT * FROM ..."
  />
</template>

<script setup lang="ts">
import { defineComponent, computed, WritableComputedRef } from "vue";
import { VAceEditor } from "vue3-ace-editor";
import "brace/theme/monokai";
import "brace/mode/sql";

defineComponent({ VAceEditor });

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "runQuery"]);

const runQuery = () => {
  emits("runQuery");
};

const inputText: WritableComputedRef<string> = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emits("update:modelValue", value);
  },
});
</script>

<style>
.ace_gutter {
  top: 10px;
  margin: -10px;
}
.ace_scroller {
  top: 10px;
  margin: -10px;
}

/* .ace_layer.ace_marker-layer {
  display: none;
} */
</style>
