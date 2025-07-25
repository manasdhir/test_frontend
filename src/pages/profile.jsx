import React from "react";

const Profile = () => {
  // Dummy user data (replace with real user data as needed)
  const user = {
    name: "Manas Dhir",
    email: "dhir.manas@gmail.com",
    avatar: "./manas.png",
    role: "User",
  };

  return (
    <div className="bg-black w-full h-full rounded-l-2xl flex flex-col items-center justify-center text-white p-8">
      <div className="flex flex-col items-center gap-4 bg-neutral-900/80 rounded-2xl p-8 shadow-lg w-full max-w-md">
        <img
          src={user.avatar}
          alt="User Avatar"
          className="w-24 h-24 rounded-full border-4 border-neutral-700 shadow"
        />
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <p className="text-neutral-400">{user.email}</p>
        <p className="text-neutral-500 text-sm">{user.role}</p>
        <div className="mt-4 text-center text-neutral-300">
          <p>
            Welcome, {user.name}! Here you can view and edit your profile
            information. More features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
