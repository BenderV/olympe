<template>
  <BaseTabs :tabs="options" :selected="outputType" @change="updateType" />
  <div v-if="outputType == 'Value'">
    {{ getUniqueValueOfTable }}
  </div>
  <BaseTable v-if="outputType == 'Table'" :data="data2"></BaseTable>

  <fusioncharts
    v-if="outputType != 'Table' && outputType != 'Value'"
    :type="type"
    width="100%"
    dataFormat="json"
    :dataSource="datasource"
  >
  </fusioncharts>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, compile } from "vue";
import BaseTable from "@/components/BaseTable.vue";
import BaseTabs from "@/components/BaseTabs.vue";

export default defineComponent({
  name: "BaseBuilder",
  props: ["data", "context"],
  components: {
    BaseTable,
    BaseTabs,
  },
  setup: (props) => {
    const options = computed(() => {
      const defaultOptions = ["Table", "Line", "Doughnut2d", "Column2d"];
      return defaultOptions.concat(hasOneValue.value ? ["Value"] : []);
    });
    const outputType = ref("Table");

    const hasOneValue = computed(() => {
      return props.data.length === 1 && Object.keys(props.data[0]).length === 1;
    });
    const hasTwoKeys = computed(() => {
      return props.data.length >= 1 && Object.keys(props.data[0]).length === 2;
    });

    const defaultVisualisation = computed(() => {
      if (hasOneValue.value) {
        return "Value";
      } else if (hasTwoKeys.value) {
        return "Line";
      } else {
        return "Table";
      }
    });
    const getUniqueValueOfTable = computed(() => {
      if (hasOneValue.value) {
        return props.data[0][Object.keys(props.data[0])[0]];
      } else {
        return null;
      }
    });

    // update defaultVisualisation when props.data changes
    watch(
      () => props.data,
      () => {
        outputType.value = defaultVisualisation.value;
      }
    );

    // outputType.value = defaultVisualisation.value

    const updateType = (type) => {
      console.log("updateType", type);
      outputType.value = type;
    };

    const columns = computed(() =>
      props.data.length ? Object.keys(props.data[0]) : ["a", "b"]
    );
    const data2 = computed(() => props.data);

    const dataTest = computed(() => {
      return {
        chart: {
          caption: props.context, //Set the chart caption
          xAxisName: columns.value[0], // Set the x-axis name
          yAxisName: columns.value[1], // Set the y-axis name
          // numberSuffix: "K",
          theme: "fusion",
        },
        // Chart Data - from step 2
        // { id: 2, name: "911" }
        data: props.data?.map((dict) => {
          // If "count" is in the dictionary, use it as the y-axis value.
          // Otherwise, use the value of the first key in the dictionary.
          const keysSet = new Set(Object.keys(dict));
          const yDefaultKeys = [
            "count",
            "total",
            "sum",
            "average",
            "percentage",
          ];
          const xDefaultKeys = ["year", "id", "name"];
          let yDefaultKey = yDefaultKeys.find((key) => keysSet.has(key));
          let xDefaultKey = xDefaultKeys.find((key) => keysSet.has(key));
          keysSet.delete(xDefaultKey);
          keysSet.delete(yDefaultKey);

          if (xDefaultKey === undefined) {
            // If there is no x-axis key, use the first key in the dictionary.
            xDefaultKey = keysSet.values().next().value;
            keysSet.delete(xDefaultKey);
          }
          if (yDefaultKey === undefined) {
            // If there is no y-axis key, use the last key in the dictionary.
            yDefaultKey = keysSet.values().next().value;
            console.log(
              "yDefaultKey...",
              yDefaultKey,
              Array(keysSet),
              keysSet.values()
            );
          }

          console.log("keysSet", keysSet);
          console.log("yDefaultKey", yDefaultKey);
          console.log("xDefaultKey", xDefaultKey);

          return {
            label: dict[xDefaultKey],
            value: dict[yDefaultKey],
          };
        }),
      };
    });

    const visType = computed(() => outputType.value.toLocaleLowerCase());
    return {
      updateType,
      outputType,
      options,
      data2,
      hasOneValue,
      getUniqueValueOfTable,
      datasource: dataTest,
      type: visType, // "doughnut2d", // "line", // "column2d",
    };
  },
});
</script>

<style></style>
