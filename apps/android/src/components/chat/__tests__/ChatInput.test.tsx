import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ChatInput } from "../ChatInput";

describe("ChatInput", () => {
  it("calls onSend with trimmed text and clears the field", () => {
    const onSend = jest.fn();
    const { getByPlaceholderText } = render(<ChatInput onSend={onSend} />);
    const input = getByPlaceholderText("Ask anything…");

    fireEvent.changeText(input, "  hello there  ");
    fireEvent(input, "submitEditing");

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello there");
    expect(input.props.value).toBe("");
  });

  it("does not send when the draft is empty or whitespace-only", () => {
    const onSend = jest.fn();
    const { getByPlaceholderText } = render(<ChatInput onSend={onSend} />);
    const input = getByPlaceholderText("Ask anything…");

    fireEvent.changeText(input, "   ");
    fireEvent(input, "submitEditing");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send while disabled", () => {
    const onSend = jest.fn();
    const { getByPlaceholderText } = render(<ChatInput onSend={onSend} disabled />);
    const input = getByPlaceholderText("Ask anything…");

    fireEvent.changeText(input, "hi");
    fireEvent(input, "submitEditing");

    expect(onSend).not.toHaveBeenCalled();
    expect(input.props.editable).toBe(false);
  });
});
