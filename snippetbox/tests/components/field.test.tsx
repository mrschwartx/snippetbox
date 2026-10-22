import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FormError } from "@/components/field";

describe("Field", () => {
  it("links the label to the input", () => {
    render(<Field label="Title" name="title" />);
    const input = screen.getByLabelText("Title:");
    expect(input).toHaveAttribute("name", "title");
    expect(input).toHaveAttribute("id", "title");
  });

  it("defaults to a text input", () => {
    render(<Field label="Title" name="title" />);
    expect(screen.getByLabelText("Title:")).toHaveAttribute("type", "text");
  });

  it.each(["email", "password"] as const)("supports the %s type", (type) => {
    render(<Field label="Thing" name="thing" type={type} />);
    expect(screen.getByLabelText("Thing:")).toHaveAttribute("type", type);
  });

  it("prefills the default value", () => {
    render(<Field label="Name" name="name" defaultValue="Ada" />);
    expect(screen.getByLabelText("Name:")).toHaveValue("Ada");
  });

  it("shows an error message when provided", () => {
    render(<Field label="Name" name="name" error="This field cannot be blank" />);
    expect(screen.getByText("This field cannot be blank")).toHaveClass("error");
  });

  it("shows no error element when there is no error", () => {
    const { container } = render(<Field label="Name" name="name" />);
    expect(container.querySelector(".error")).toBeNull();
  });
});

describe("FormError", () => {
  it("renders the message", () => {
    render(<FormError message="Email or password is incorrect" />);
    expect(screen.getByText("Email or password is incorrect")).toHaveClass("error");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FormError />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty message", () => {
    const { container } = render(<FormError message="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
