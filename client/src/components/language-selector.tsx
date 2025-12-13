import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", name: "English", flag: "GB" },
  { code: "tr", name: "Turkce", flag: "TR" },
  { code: "de", name: "Deutsch", flag: "DE" },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-selector">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Select language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
            className={language.code === currentLanguage.code ? "bg-accent" : ""}
            data-testid={`menu-item-language-${language.code}`}
          >
            <span className="mr-2 text-lg">{language.flag === "GB" ? "🇬🇧" : language.flag === "TR" ? "🇹🇷" : "🇩🇪"}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
