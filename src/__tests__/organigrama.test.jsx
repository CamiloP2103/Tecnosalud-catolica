import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Nosotros from "../components/pages/Nosotros/Nosotros";

describe("Organigrama", () => {
  it("muestra a los participantes con foto y GitHub en orden alfabético", () => {
    render(<Nosotros seccion="organigrama" />);

    const logins = [
      "caenjiro",
      "CamiloP2103",
      "Juanesphi",
      "mmorales463",
      "Vegetto14",
    ];
    const profileLinks = screen.getAllByRole("link", {
      name: /Perfil de GitHub de/,
    });

    expect(
      screen.getByRole("heading", { name: "Participantes del proyecto" }),
    ).toBeInTheDocument();
    expect(profileLinks.map((link) => link.getAttribute("aria-label"))).toEqual(
      logins.map((login) => `Perfil de GitHub de ${login}`),
    );

    logins.forEach((login) => {
      expect(
        screen.getByRole("img", { name: `Foto de ${login}` }),
      ).toHaveAttribute("src", `https://github.com/${login}.png?size=160`);
      expect(
        screen.getByRole("link", { name: `Perfil de GitHub de ${login}` }),
      ).toHaveAttribute("href", `https://github.com/${login}`);
    });
  });
});
