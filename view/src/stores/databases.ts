import { ref, computed, Ref, WritableComputedRef } from "vue";
import axios from "axios";

interface Column {
  name: string;
  dataType: string;
}

interface Table {
  name: string;
  description: string;
  columns: Column[];
}
export interface Database {
  id: number;
  name: string;
  tables?: Table[];
  engine: string;
  details: any;
}

// DEFINE STATES
const databases: Ref<Database[]> = ref([]); // Add type...
const savedDatabaseId = localStorage.getItem("databaseId");
const databaseSelectedId: Ref<number | null> = ref(
  savedDatabaseId ? parseInt(savedDatabaseId) : null
);

const databaseSelected: WritableComputedRef<Database> = computed({
  get() {
    return databases.value.find(
      (database) => database.id === databaseSelectedId.value
    );
  },
  async set(database) {
    await selectDatabaseById(database.id);
  },
});

// Fetches
const fetchDatabases = async ({ refresh }) => {
  if (databases.value.length > 0 && !refresh) {
    // Skip if already fetched
    return;
  }
  databases.value = await axios.get(`/api/databases`).then((res) => res.data);
  if (databases.value.length === 0) {
    // If no databases, skip
    return;
  }
  if (databaseSelectedId.value === null) {
    databaseSelectedId.value = databases.value[0].id;
  }
  // await addDatabaseSchema(databaseSelectedId.value);

  return databases.value;
};

const addDatabaseSchema = async (databaseId: number) => {
  const database = databases.value.find(
    (database) => database.id === databaseId
  );

  const tables = await axios
    .get(`/api/databases/${databaseId}/schema`)
    .then((res) => res.data);

  database.tables = tables;
};

// Methods
const updateScan = async () => {
  await axios
    .get(`/api/databases/${databaseSelected.value.id}/_scan`)
    .then((res) => res.data);
  await addDatabaseSchema(databaseSelected.value.id);
};

// Computed
const selectDatabaseById = async (id: number) => {
  databaseSelectedId.value = id;
  localStorage.setItem("databaseId", id.toString());
  addDatabaseSchema(databaseSelectedId.value);
};

const updateDatabase = async (id: number, database: Database) => {
  return await axios.put("/api/databases/" + id, database);
};

const createDatabase = async (database: Database): Promise<Database> => {
  return axios.post("/api/databases", database).then((response) => {
    return response.data;
  });
};

const deleteDatabase = (id: number) => {
  return axios.delete("/api/databases/" + id);
};

const getDatabaseById = (id: number) => {
  return axios.get("/api/databases/").then((response) => {
    return response.data.find((db) => db.id === id);
  });
};

export const useDatabases = () => {
  return {
    fetchDatabases,
    updateScan,
    databases,
    databaseSelected,
    selectDatabaseById,
    updateDatabase,
    createDatabase,
    deleteDatabase,
    getDatabaseById,
  };
};
