<template>
  <TabGroup @change="changeTab">
    <TabList class="flex items-center">
      <Tab as="template" v-slot="{ selected }">
        <button
          :class="[
            selected
              ? 'text-gray-900 bg-gray-100 hover:bg-gray-200'
              : 'text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100',
            'px-3 py-1.5 border border-transparent text-sm font-medium rounded-md',
          ]"
        >
          English
        </button>
      </Tab>
      <Tab as="template" v-slot="{ selected }">
        <button
          :class="[
            selected
              ? 'text-gray-900 bg-gray-100 hover:bg-gray-200'
              : 'text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100',
            'ml-2 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md',
          ]"
        >
          SQL
        </button>
      </Tab>
      <BaseSelector
        class="float-right ml-auto"
        style="width: 200px"
        :options="databases"
        v-model="databaseSelected"
      ></BaseSelector>
    </TabList>
    <TabPanels class="mt-2">
      <TabPanel class="p-0.5 -m-0.5 rounded-lg">
        <label for="comment" class="sr-only">Comment</label>
        <div>
          <textarea
            v-model="queryText"
            rows="1"
            name="comment"
            id="comment"
            class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full border-gray-300 rounded-md"
            placeholder="Show 5 random rows of ..."
            @keydown.enter.meta.exact="query"
          />
        </div>
      </TabPanel>
      <TabPanel class="p-0.5 -m-0.5 rounded-lg">
        <BaseEditor v-model="querySQL" @run-query="runQuery"></BaseEditor>
      </TabPanel>
    </TabPanels>
  </TabGroup>

  <div class="mt-2 flex justify-end">
    <button
      v-if="selectedIndex === 1"
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mx-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none"
      @click="validateQuery"
      :disabled="queryValidated && !queryIsModified"
    >
      <span v-if="!queryIsModified">Validate query</span>
      <span v-else>Save correction</span>
    </button>

    <button
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      @click="query()"
      :disabled="queryLoading"
    >
      <ArrowPathIcon
        v-if="queryLoading"
        class="animate-reverse-spin h-5 w-5 text-white mr-2"
      />
      Run Query
    </button>
  </div>
</template>

<script setup lang="ts">
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/vue";
import BaseEditor from "@/components/BaseEditor.vue";
import {
  queryText,
  querySQL,
  translate,
  runQuery,
  validateQuery,
  queryIsModified,
  loading as queryLoading,
  queryValidated,
} from "../stores/query";
import { ref } from "vue";

import { useDatabases } from "../stores/databases";
import BaseSelector from "./BaseSelector.vue";
import { ArrowPathIcon } from "@heroicons/vue/24/outline";
import { Bars3Icon } from "@heroicons/vue/24/solid";

const { databaseSelected, databases } = useDatabases();

const props = defineProps({
  database: Object,
});

const selectedIndex = ref<number>(0);
const changeTab = (index) => {
  selectedIndex.value = index;
};
const query = async () => {
  if (selectedIndex.value === 0) {
    // if "english" is selected
    await translate();
  }
  runQuery();
};
</script>
