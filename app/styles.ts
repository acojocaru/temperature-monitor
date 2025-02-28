import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  temperatureContainer: {
    alignItems: "center",
    marginVertical: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    width: "100%",
  },
  temperature: {
    fontSize: 48,
    fontWeight: "bold",
  },
  tempInRange: {
    color: "#34C759", // Green
  },
  tempOutOfRange: {
    color: "#FF3B30", // Red
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  message: {
    fontSize: 16,
    marginVertical: 20,
  },
  errorMessage: {
    fontSize: 16,
    color: "red",
    marginVertical: 20,
  },
  refreshButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  configButton: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#34C759",
    borderRadius: 5,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  tokenContainer: {
    width: "100%",
    marginVertical: 20,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    width: "100%",
  },
  saveButton: {
    padding: 10,
    backgroundColor: "#34C759",
    borderRadius: 5,
    alignItems: "center",
  },
  tokenButtonsContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  clearButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FF3B30",
    borderRadius: 5,
    minWidth: 200,
    alignItems: "center",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    fontStyle: 'italic'
  },
  rangeContainer: {
    width: "100%",
    marginVertical: 20,
  },
  rangeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rangeLabel: {
    width: 50,
    fontSize: 16,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
  },
  rangeInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 15,
  },
  rangeStatus: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  inRangeText: {
    color: "#34C759", // Green
  },
  outOfRangeText: {
    color: "#FF3B30", // Red
  },
}); 