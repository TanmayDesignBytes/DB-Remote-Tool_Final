import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import ActionConfirmModal from "../dashboard/ActionConfirmModal.jsx";
import {
  createGroup,
  deleteGroup,
  getGroups,
  getMyDevices,
  updateGroup,
} from "../../lib/api.js";
import AddGroupModal from "./AddGroupModal.jsx";

const defaultGroupOptions = [
  { id: "GCU", label: "GCU" },
  { id: "Microgrid", label: "Microgrid" },
  { id: "Koel", label: "Koel" },
];

const groupMenuActions = [
  { label: "Edit", iconSrc: "/assets/edit-03.svg" },
  { label: "Delete", iconSrc: "/assets/trash-01.svg" },
  {
    label: "Agents",
    iconSrc: "/assets/star-04.svg",
    disabled: true,
    hint: "Upcoming feature",
  },
  {
    label: "Contacts",
    iconSrc: "/assets/contact.svg",
    disabled: true,
    hint: "Upcoming feature",
  },
  {
    label: "Share",
    iconSrc: "/assets/share-06.svg",
    disabled: true,
    hint: "Upcoming feature",
  },
];

const MENU_WIDTH_REM = 10.4375;
const MENU_HEIGHT_REM = 14;
const MENU_GAP_REM = 0.5;
const VIEWPORT_MARGIN_REM = 1;

function normalizeGroupName(value) {
  return String(value || "").trim();
}

function getDeviceItems(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.all)) {
    return response.all;
  }
  if (Array.isArray(response?.data?.all)) {
    return response.data.all;
  }
  if (Array.isArray(response?.devices)) {
    return response.devices;
  }
  if (Array.isArray(response?.data?.devices)) {
    return response.data.devices;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function getGroupItems(response) {
  const rawGroups = Array.isArray(response?.groups)
    ? response.groups
    : Array.isArray(response?.data?.groups)
      ? response.data.groups
      : Array.isArray(response?.data)
        ? response.data
        : [];

  return rawGroups
    .map((group) => {
      if (typeof group === "string") {
        return {
          backendId: null,
          name: normalizeGroupName(group),
          description: "",
        };
      }

      return {
        backendId: group?.id ?? null,
        name: normalizeGroupName(group?.name),
        description: String(group?.description || "").trim(),
      };
    })
    .filter((group) => group.name);
}

function buildGroupCards(devices, backendGroups) {
  const groupMap = new Map(
    defaultGroupOptions.map((option) => [
      option.label,
      {
        id: `group:${option.label}`,
        backendId: null,
        name: option.label,
        description: "",
        count: 0,
      },
    ]),
  );

  backendGroups.forEach((group) => {
    const groupKey = normalizeGroupName(group.name);
    const existing = groupMap.get(groupKey);

    if (!groupKey) {
      return;
    }

    groupMap.set(groupKey, {
      id: group.backendId ? `group:${group.backendId}` : `group:${groupKey}`,
      backendId: group.backendId ?? null,
      name: group.name,
      description: group.description || existing?.description || "",
      count: existing?.count || 0,
    });
  });

  devices.forEach((device) => {
    const groupName = String(device?.group || "").trim();

    if (!groupName) {
      return;
    }

    const existing = groupMap.get(groupName) || {
      id: `group:${groupName}`,
      backendId: null,
      name: groupName,
      description: "",
      count: 0,
    };

    groupMap.set(groupName, {
      ...existing,
      count: existing.count + 1,
      description:
        existing.description ||
        String(device?.description || "").trim() ||
        `Devices assigned to ${groupName}`,
    });
  });

  return Array.from(groupMap.values()).map((group) => ({
    id: group.id,
    backendId: group.backendId,
    name: group.name,
    label: `${group.count} device${group.count === 1 ? "" : "s"}`,
    description: group.description || "No devices assigned yet.",
  }));
}

function GroupActionMenu({ onSelectAction }) {
  return (
    <div className="flex w-[10.4375rem] flex-col items-start rounded-[0.5rem] border border-[rgba(234,236,240,0.5)] bg-white py-[0.25rem] shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25),0_0.75rem_1.25rem_rgba(7,6,18,0.25)]">
      {groupMenuActions.map(({ label, iconSrc, disabled = false, hint }) => (
        <div
          key={label}
          className="group relative w-full first:rounded-t-[0.375rem] last:rounded-b-[0.375rem]"
        >
          <button
            type="button"
            aria-disabled={disabled}
            onClick={() => {
              if (!disabled) {
                onSelectAction(label);
              }
            }}
            className={`flex w-full items-center gap-[0.75rem] px-[0.625rem] py-[0.5625rem] text-left transition-colors first:rounded-t-[0.375rem] last:rounded-b-[0.375rem] ${
              disabled
                ? "cursor-not-allowed text-[#667085] hover:bg-[#F4F7FE]"
                : "hover:bg-[#F4F7FE]"
            }`}
          >
            <img
              src={iconSrc}
              alt=""
              className={`h-[1rem] w-[1rem] shrink-0 object-contain ${
                disabled ? "opacity-70" : ""
              }`}
            />
            <span
              className={`font-dmSans text-[0.875rem] font-medium leading-[1.25rem] ${
                disabled ? "text-[#667085]" : "text-[#101728]"
              }`}
            >
              {label}
            </span>
          </button>

          {disabled && hint ? (
            <div className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-[0.375rem] bg-[#101728] px-[0.5rem] py-[0.25rem] font-inter text-[0.75rem] font-medium leading-[1rem] text-white opacity-0 shadow-[0_0.25rem_0.75rem_rgba(16,23,40,0.18)] transition-opacity duration-150 group-hover:opacity-100">
              {hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FixedGroupActionMenu({ anchorEl, onClose, onSelectAction }) {
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!anchorEl) {
      return undefined;
    }

    const updatePosition = () => {
      const rootFontSize =
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = MENU_WIDTH_REM * rootFontSize;
      const menuHeight = MENU_HEIGHT_REM * rootFontSize;
      const gap = MENU_GAP_REM * rootFontSize;
      const margin = VIEWPORT_MARGIN_REM * rootFontSize;

      let left = rect.right + gap;
      if (left + menuWidth > window.innerWidth - margin) {
        left = rect.left - menuWidth - gap;
      }

      left = Math.min(
        Math.max(left, margin),
        window.innerWidth - menuWidth - margin,
      );

      const top = Math.min(
        Math.max(rect.top, margin),
        window.innerHeight - menuHeight - margin,
      );

      setMenuStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    if (!anchorEl) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      if (anchorEl.contains(event.target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl || !menuStyle) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[999] max-h-[calc(100vh-2rem)] overflow-visible"
      style={menuStyle}
    >
      <GroupActionMenu onSelectAction={onSelectAction} />
    </div>,
    document.body,
  );
}

function GroupCard({ group, onToggleMenu }) {
  return (
    <article className="flex h-[9.375rem] w-[19.6875rem] shrink-0 items-center rounded-[0.9375rem] border border-[rgba(217,217,217,0.5)] bg-white px-[1.0625rem] pb-[1.51519rem] pt-[1.75rem] transition-all duration-300 ease-out hover:shadow-[0_1.25rem_2.5rem_rgba(0,0,0,0.15),0_0.5rem_1rem_rgba(0,0,0,0.10)]">
      <div className="flex h-full w-full items-start gap-[0.5rem]">
        <div className="flex h-[2.0625rem] w-[2.0625rem] shrink-0 items-center justify-center rounded-[0.4375rem] bg-[#F4F7FE] px-[0.625rem] pb-[0.4375rem] pt-[0.5rem]">
          <img
            src="/assets/piobject.png"
            alt=""
            className="h-[1.125rem] w-[0.875rem] shrink-0 object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.4375rem]">
          <div className="flex h-[2.49275rem] w-full items-start justify-between">
            <h2 className="min-w-0 flex-1 truncate font-dmSans text-[1.375rem] font-bold leading-[2.625rem] tracking-[-0.0275rem] text-black">
              {group.name}
            </h2>

            <button
              type="button"
              aria-label={`${group.name} actions`}
              className="flex h-[1.71025rem] w-[1.6865rem] shrink-0 items-center justify-center rounded-[0.25rem] opacity-70 hover:bg-[#F4F6FB]"
              onClick={onToggleMenu}
            >
              <img
                src="/assets/dots-horizontal.svg"
                alt=""
                className="h-[1.71025rem] w-[1.6865rem] object-contain"
              />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-start gap-[0.4375rem] self-stretch">
            <p className="h-[1.371rem] w-full truncate font-dmSans text-[0.875rem] font-medium leading-[1.5rem] text-[#5D657D]">
              {group.label}
            </p>
            <p className="h-[1.371rem] w-full truncate font-dmSans text-[0.875rem] font-medium leading-[1.5rem] text-[#5D657D]">
              {group.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function GroupContent({ searchQuery = "" }) {
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupOverrides, setGroupOverrides] = useState({});
  const [hiddenGroupIds, setHiddenGroupIds] = useState([]);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupErrorMessage, setGroupErrorMessage] = useState("");
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      const response = await getMyDevices();
      setDevices(getDeviceItems(response));
    } catch {
      setDevices([]);
    }
  }, []);

  const loadGroups = useCallback(async (knownGroups = []) => {
    try {
      const response = await getGroups();
      const fetchedGroups = getGroupItems(response);

      setGroups((current) => {
        const knownByName = new Map(
          [...current, ...knownGroups]
            .filter(Boolean)
            .map((group) => [normalizeGroupName(group.name), group]),
        );

        return fetchedGroups.map((group) => {
          const knownGroup = knownByName.get(group.name);

          return {
            backendId: group.backendId ?? knownGroup?.backendId ?? null,
            name: group.name,
            description: group.description || knownGroup?.description || "",
          };
        });
      });
    } catch {
      setGroups((current) => (current.length ? current : []));
    }
  }, []);

  useEffect(() => {
    void loadDevices();
    void loadGroups();
  }, [loadDevices, loadGroups]);

  const handleToggleMenu = (groupId, anchorEl) => {
    setOpenMenu((current) => {
      if (current?.id === groupId) {
        return null;
      }

      return { id: groupId, anchorEl };
    });
  };

  const groupCards = useMemo(() => {
    const hiddenIds = new Set(hiddenGroupIds);

    return buildGroupCards(devices, groups)
      .map((group) => ({
        ...group,
        ...(groupOverrides[group.id] || {}),
      }))
      .filter((group) => !hiddenIds.has(group.id));
  }, [devices, groupOverrides, groups, hiddenGroupIds]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return groupCards;
    }

    return groupCards.filter((group) =>
      [group.name, group.label, group.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [groupCards, searchQuery]);

  const closeGroupEditor = () => {
    if (isSubmittingGroup) {
      return;
    }

    setIsAddGroupOpen(false);
    setEditingGroup(null);
    setGroupErrorMessage("");
  };

  const handleSaveGroup = async (values) => {
    const trimmedName = String(values?.name || "").trim();
    const trimmedDescription = String(values?.description || "").trim();

    if (!trimmedName) {
      setGroupErrorMessage("Enter a group name to continue.");
      return;
    }

    setGroupErrorMessage("");
    setIsSubmittingGroup(true);

    try {
      if (editingGroup) {
        if (editingGroup.backendId != null) {
          const response = await updateGroup(editingGroup.backendId, {
            name: trimmedName,
            description: trimmedDescription,
          });

          const updatedGroup = response?.data || {
            id: editingGroup.backendId,
            name: trimmedName,
            description: trimmedDescription,
          };

          await loadGroups([
            {
              backendId: updatedGroup.id ?? editingGroup.backendId,
              name: updatedGroup.name || trimmedName,
              description: updatedGroup.description ?? trimmedDescription,
            },
          ]);

          setGroupOverrides((current) => {
            const next = { ...current };
            delete next[editingGroup.id];
            return next;
          });
        } else {
          setGroupOverrides((current) => ({
            ...current,
            [editingGroup.id]: {
              name: trimmedName,
              description: trimmedDescription || "No devices assigned yet.",
            },
          }));
        }
      } else {
        const response = await createGroup({
          name: trimmedName,
          description: trimmedDescription,
        });

        const savedGroup = response?.data || {};
        await loadGroups([
          {
            backendId: savedGroup.id ?? null,
            name: savedGroup.name || trimmedName,
            description: savedGroup.description ?? trimmedDescription,
          },
        ]);
      }

      setHiddenGroupIds((current) =>
        editingGroup ? current.filter((groupId) => groupId !== editingGroup.id) : current,
      );
      setIsAddGroupOpen(false);
      setEditingGroup(null);
      setGroupErrorMessage("");
    } catch (error) {
      setGroupErrorMessage(error?.message || "Unable to save group right now.");
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeletingGroup) {
      return;
    }

    setDeletingGroup(null);
    setDeleteErrorMessage("");
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) {
      return;
    }

    setDeleteErrorMessage("");
    setIsDeletingGroup(true);

    try {
      if (deletingGroup.backendId != null) {
        await deleteGroup(deletingGroup.backendId);
        await loadGroups();
      }

      setHiddenGroupIds((current) =>
        current.includes(deletingGroup.id)
          ? current
          : [...current, deletingGroup.id],
      );
      setGroupOverrides((current) => {
        const next = { ...current };
        delete next[deletingGroup.id];
        return next;
      });
      setDeletingGroup(null);
    } catch (error) {
      setDeleteErrorMessage(error?.message || "Unable to delete group right now.");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleMenuAction = (actionLabel) => {
    const selectedGroup = groupCards.find((group) => group.id === openMenu?.id);
    setOpenMenu(null);

    if (!selectedGroup) {
      return;
    }

    if (actionLabel === "Edit") {
      setGroupErrorMessage("");
      setEditingGroup(selectedGroup);
      setIsAddGroupOpen(true);
      return;
    }

    if (actionLabel === "Delete") {
      setDeleteErrorMessage("");
      setDeletingGroup(selectedGroup);
    }
  };

  return (
    <>
      <div className="h-full pl-[3.625rem] pr-[2.5625rem] pt-[1.5rem]">
        <div className="flex items-start justify-between">
          <h1 className="h-[1.125rem] w-[10.875rem] font-inter text-[1.125rem] font-semibold leading-[1.18763rem] text-[rgba(0,0,0,0.75)]">
            Group Details
          </h1>

          <button
            type="button"
            onClick={() => {
              setOpenMenu(null);
              setEditingGroup(null);
              setGroupErrorMessage("");
              setIsAddGroupOpen(true);
            }}
            className="flex h-[3.5rem] w-[9.25rem] items-center justify-center gap-[0.13rem] rounded-[1.75rem] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] font-inter text-[1rem] font-semibold leading-[1.18763rem] text-white shadow-[0_0.25rem_1rem_rgba(41,112,255,0.26)]"
          >
            <img
              src="/assets/plus.svg"
              alt=""
              className="h-[1.3125rem] w-[1.3125rem] shrink-0 object-contain"
            />
            <span className="h-[1.125rem] w-[5.5625rem] text-left">
              Add Group
            </span>
          </button>
        </div>

        <div className="-ml-[1.75rem] mt-[1.53rem] h-px w-[calc(100%+2.5rem)] bg-[#ECECEC]" />

        {filteredGroups.length > 0 ? (
          <div className="-ml-[1.505rem] -mr-[1.05rem] mt-[1.875rem] flex flex-wrap items-start gap-[0.9375rem]">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onToggleMenu={(event) =>
                  handleToggleMenu(group.id, event.currentTarget)
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-[1.875rem] flex min-h-[12rem] w-full items-center justify-center px-[1.5rem] text-center font-dmSans text-[1.125rem] font-medium leading-[1.75rem] text-[#5D657D]">
            No groups found from your device cards yet.
          </div>
        )}
      </div>

      <FixedGroupActionMenu
        anchorEl={openMenu?.anchorEl ?? null}
        onClose={() => setOpenMenu(null)}
        onSelectAction={handleMenuAction}
      />

      <AddGroupModal
        open={isAddGroupOpen}
        onClose={closeGroupEditor}
        onConfirm={handleSaveGroup}
        initialValues={
          editingGroup
            ? {
                name: editingGroup.name,
                description: editingGroup.description,
              }
            : undefined
        }
        title={editingGroup ? "Edit Group" : "Add Group"}
        confirmLabel={editingGroup ? "Save" : "Confirm"}
        isSubmitting={isSubmittingGroup}
        errorMessage={groupErrorMessage}
      />

      <ActionConfirmModal
        open={Boolean(deletingGroup)}
        title="Delete group"
        message={`Are you sure you want to delete ${deletingGroup?.name || "this group"}?`}
        confirmLabel="Delete"
        isSubmitting={isDeletingGroup}
        errorMessage={deleteErrorMessage}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteGroup}
      />
    </>
  );
}

export default GroupContent;
