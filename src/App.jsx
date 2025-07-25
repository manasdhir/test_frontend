import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import {
  IconArrowLeft,
  IconBook,
  IconBrandTabler,
  IconRobotFace,
  IconSettings,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import Dashboard from "./pages/dashboard";
import ChatBot from "./pages/chatbot";
import KnowledgeBase from "./pages/knowledgebase";
import Profile from "./pages/profile";

const links = [
  {
    label: "Chatbot",
    page: "chatbot",
    icon: (
      <IconRobotFace className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Dashboard",
    page: "dashboard",
    icon: (
      <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Knowledge Base",
    page: "knowledgebase",
    icon: (
      <IconBook className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Logout",
    page: "logout",
    icon: (
      <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
];

const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <img src="./logowhite.svg" className="h-7 w-7 shrink-0" alt="Logo" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        Voice Bot
      </motion.span>
    </a>
  );
};
const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <img src="./logowhite.svg" className="h-7 w-7 shrink-0" alt="Logo" />
    </a>
  );
};

const App = () => {
  const [open, setOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("chatbot");

  let PageComponent = null;
  if (selectedPage === "dashboard") PageComponent = Dashboard;
  else if (selectedPage === "chatbot") PageComponent = ChatBot;
  else if (selectedPage === "knowledgebase") PageComponent = KnowledgeBase;
  else if (selectedPage === "profile") PageComponent = Profile;

  return (
    <div
      className={cn(
        "mx-auto flex w-screen h-screen max-w-none flex-1 flex-col overflow-hidden rounded-none border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink
                  key={idx}
                  link={link}
                  onClick={() => {
                    if (link.page === "logout") return; // handle logout separately if needed
                    setSelectedPage(link.page);
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Manas Dhir",
                page: "profile",
                icon: (
                  <img
                    src="./manas.png"
                    className="h-7 w-7 shrink-0 rounded-full"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
              onClick={() => setSelectedPage("profile")}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      {PageComponent && <PageComponent />}
    </div>
  );
};

export default App;
