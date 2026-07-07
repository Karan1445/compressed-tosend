export const ANSWER_TYPES = [
  "Text", "Radio-selection", "Dropdown-selection", "Group Fields",
  "Date-picker", "Email", "Phone Number", "Number", "Amount",
  "Percentage", "Address", "Checkbox"
];

export const GROUP_FIELD_TYPES = ANSWER_TYPES.filter(t => t !== "Group Fields");
