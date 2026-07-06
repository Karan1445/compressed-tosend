export const ANSWER_TYPES = [
  "Text", "Radio-selection", "Dropdown-selection", "Group Fields",
  "Date-picker", "Email", "Phone Number", "Number", "Amount",
  "Percentage", "Address", "Checkbox"
];

export const GROUP_FIELD_TYPES = ANSWER_TYPES.filter(t => t !== "Group Fields");

export const PERSONA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "single-no-children", label: "Single without Children" },
  { value: "single-children", label: "Single with Children" },
  { value: "married-no-children", label: "Married without Children" },
  { value: "married-children", label: "Married with Children" },
];
