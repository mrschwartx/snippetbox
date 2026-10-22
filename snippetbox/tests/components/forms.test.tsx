import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction, signupAction } from "@/actions/auth";
import { createSnippetAction } from "@/actions/snippets";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { SnippetForm } from "@/components/snippet-form";
import type { FormState } from "@/lib/form";

vi.mock("@/actions/auth", () => ({ loginAction: vi.fn(), signupAction: vi.fn(), logoutAction: vi.fn() }));
vi.mock("@/actions/snippets", () => ({ createSnippetAction: vi.fn() }));

const empty: FormState = { errors: {}, values: {} };

beforeEach(() => {
  vi.mocked(loginAction).mockResolvedValue(empty);
  vi.mocked(signupAction).mockResolvedValue(empty);
  vi.mocked(createSnippetAction).mockResolvedValue(empty);
});

describe("LoginForm", () => {
  it("renders email, password and a submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email:")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password:")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Login" })).toBeEnabled();
  });

  it("submits the entered values to the action", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email:"), "ada@example.com");
    await user.type(screen.getByLabelText("Password:"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(loginAction).toHaveBeenCalledTimes(1));
    const submitted = vi.mocked(loginAction).mock.calls[0][1];
    expect(submitted.get("email")).toBe("ada@example.com");
    expect(submitted.get("password")).toBe("password123");
  });

  it("shows field and form errors returned by the action", async () => {
    vi.mocked(loginAction).mockResolvedValue({
      errors: { password: "This field cannot be blank" },
      formError: "Email or password is incorrect",
      values: { email: "ada@example.com" },
    });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Email or password is incorrect")).toBeInTheDocument();
    expect(screen.getByText("This field cannot be blank")).toBeInTheDocument();
  });
});

describe("SignupForm", () => {
  it("renders name, email, password and a submit button", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("Name:")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Email:")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password:")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Signup" })).toBeEnabled();
  });

  it("submits the entered values to the action", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText("Name:"), "Ada");
    await user.type(screen.getByLabelText("Email:"), "ada@example.com");
    await user.type(screen.getByLabelText("Password:"), "password123");
    await user.click(screen.getByRole("button", { name: "Signup" }));

    await waitFor(() => expect(signupAction).toHaveBeenCalledTimes(1));
    const submitted = vi.mocked(signupAction).mock.calls[0][1];
    expect(submitted.get("name")).toBe("Ada");
    expect(submitted.get("email")).toBe("ada@example.com");
    expect(submitted.get("password")).toBe("password123");
  });

  it("shows validation errors and keeps the submitted name and email", async () => {
    vi.mocked(signupAction).mockResolvedValue({
      errors: { email: "Email address is already in use", password: "This field must be at least 8 characters long" },
      values: { name: "Ada", email: "ada@example.com", password: "" },
    });
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByText("Email address is already in use")).toBeInTheDocument();
    expect(screen.getByText("This field must be at least 8 characters long")).toBeInTheDocument();
    expect(screen.getByLabelText("Name:")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email:")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Password:")).toHaveValue("");
  });
});

describe("SnippetForm", () => {
  it("renders title, content and the expiry choices", () => {
    render(<SnippetForm />);
    expect(screen.getByLabelText("Title:")).toBeInTheDocument();
    expect(screen.getByLabelText("Content:").tagName).toBe("TEXTAREA");
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["365", "7", "1"]);
    expect(screen.getByRole("button", { name: "Publish snippet" })).toBeEnabled();
  });

  it("selects one year by default", () => {
    render(<SnippetForm />);
    expect(screen.getByLabelText("One Year")).toBeChecked();
    expect(screen.getByLabelText("One Week")).not.toBeChecked();
    expect(screen.getByLabelText("One Day")).not.toBeChecked();
  });

  it("submits the chosen expiry", async () => {
    const user = userEvent.setup();
    render(<SnippetForm />);
    await user.type(screen.getByLabelText("Title:"), "Hello");
    await user.type(screen.getByLabelText("Content:"), "World");
    await user.click(screen.getByLabelText("One Day"));
    await user.click(screen.getByRole("button", { name: "Publish snippet" }));

    await waitFor(() => expect(createSnippetAction).toHaveBeenCalledTimes(1));
    const submitted = vi.mocked(createSnippetAction).mock.calls[0][1];
    expect(submitted.get("title")).toBe("Hello");
    expect(submitted.get("content")).toBe("World");
    expect(submitted.get("expires")).toBe("1");
  });

  it("shows every error returned by the action", async () => {
    vi.mocked(createSnippetAction).mockResolvedValue({
      errors: {
        title: "This field cannot be blank",
        content: "This field cannot be blank",
        expires: "This field must equal 1, 7 or 365",
      },
      values: { title: "", content: "", expires: "" },
    });
    const user = userEvent.setup();
    render(<SnippetForm />);
    await user.click(screen.getByRole("button", { name: "Publish snippet" }));

    expect(await screen.findAllByText("This field cannot be blank")).toHaveLength(2);
    expect(screen.getByText("This field must equal 1, 7 or 365")).toBeInTheDocument();
  });

  it("restores the previously chosen expiry and text after an error", async () => {
    vi.mocked(createSnippetAction).mockResolvedValue({
      errors: { title: "This field cannot be blank" },
      values: { title: "", content: "keep me", expires: "7" },
    });
    const user = userEvent.setup();
    render(<SnippetForm />);
    await user.click(screen.getByRole("button", { name: "Publish snippet" }));

    await screen.findByText("This field cannot be blank");
    expect(screen.getByLabelText("Content:")).toHaveValue("keep me");
    expect(screen.getByLabelText("One Week")).toBeChecked();
    expect(screen.getByLabelText("One Year")).not.toBeChecked();
  });
});
