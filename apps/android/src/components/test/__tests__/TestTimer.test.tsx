import React from "react";
import { render, act } from "@testing-library/react-native";
import { TestTimer } from "../TestTimer";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("TestTimer", () => {
  it("renders the initial time as mm:ss", () => {
    const { getByText } = render(<TestTimer seconds={90} onExpire={jest.fn()} />);
    expect(getByText("1:30")).toBeTruthy();
  });

  it("counts down each second", () => {
    const { getByText } = render(<TestTimer seconds={65} onExpire={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(getByText("0:59")).toBeTruthy();
  });

  it("fires onExpire exactly once at zero", () => {
    const onExpire = jest.fn();
    render(<TestTimer seconds={2} onExpire={onExpire} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("does not start when seconds is zero", () => {
    const onExpire = jest.fn();
    render(<TestTimer seconds={0} onExpire={onExpire} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });
});
