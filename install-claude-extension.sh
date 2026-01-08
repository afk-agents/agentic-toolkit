#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script version
VERSION="1.0.0"

# Show usage information
usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] TYPE SOURCES...

Install one or more Claude Code extensions (skills, commands, or agents) into
the .claude directory.

ARGUMENTS:
    TYPE        Extension type: skill, command, or agent
    SOURCES     One or more paths or URLs to install

OPTIONS:
    -g, --global        Install to ~/.claude (default)
    -l, --local         Install to ./.claude in current repo
    -h, --help          Show this help message
    -v, --version       Show version information

EXAMPLES:
    # Install a command globally
    $(basename "$0") command ./my-command.md

    # Install multiple skills to local repo
    $(basename "$0") -l skill ./skill1/ ./skill2/

    # Install from URL
    $(basename "$0") command https://example.com/my-command.md

EOF
    exit 0
}

# Show version
show_version() {
    echo "install-claude-extension v${VERSION}"
    exit 0
}

# Print colored message
print_msg() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Print error and exit
error_exit() {
    print_msg "$RED" "Error: $*" >&2
    exit 1
}

# Determine installation directory
get_install_dir() {
    local location=$1
    local ext_type=$2

    if [[ "$location" == "global" ]]; then
        echo "$HOME/.claude/${ext_type}s"
    else
        if [[ ! -d ".claude" ]]; then
            error_exit "No .claude directory found in current directory. Create one first or use --global."
        fi
        echo "./.claude/${ext_type}s"
    fi
}

# Validate extension type
validate_type() {
    local type=$1
    case "$type" in
        skill|command|agent)
            echo "$type"
            ;;
        skills|commands|agents)
            # Remove trailing 's'
            echo "${type%s}"
            ;;
        *)
            error_exit "Invalid type: $type. Must be one of: skill, command, agent"
            ;;
    esac
}

# Download file from URL
download_file() {
    local url=$1
    local dest=$2

    if command -v curl &> /dev/null; then
        curl -fsSL "$url" -o "$dest"
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$dest"
    else
        error_exit "Neither curl nor wget found. Cannot download from URL."
    fi
}

# Install a single extension
install_extension() {
    local source=$1
    local ext_type=$2
    local install_dir=$3

    print_msg "$BLUE" "Installing $ext_type from: $source"

    # Create install directory if it doesn't exist
    mkdir -p "$install_dir"

    # Handle URL sources
    if [[ "$source" =~ ^https?:// ]]; then
        local filename
        filename=$(basename "$source")
        local dest="$install_dir/$filename"

        print_msg "$YELLOW" "  Downloading from URL..."
        download_file "$source" "$dest"
        print_msg "$GREEN" "  ✓ Installed: $(basename "$dest")"
        return 0
    fi

    # Handle local sources
    if [[ ! -e "$source" ]]; then
        error_exit "Source not found: $source"
    fi

    local source_name
    source_name=$(basename "$source")

    if [[ -d "$source" ]]; then
        # Directory-based extension (typically skills)
        local dest="$install_dir/$source_name"

        if [[ -d "$dest" ]]; then
            print_msg "$YELLOW" "  Warning: $source_name already exists. Overwriting..."
            rm -rf "$dest"
        fi

        cp -r "$source" "$dest"
        print_msg "$GREEN" "  ✓ Installed directory: $source_name"

    elif [[ -f "$source" ]]; then
        # File-based extension (typically commands or agents)
        local dest="$install_dir/$source_name"

        # Ensure it has .md extension
        if [[ "$source_name" != *.md ]]; then
            print_msg "$YELLOW" "  Warning: Extension file should have .md extension"
        fi

        if [[ -f "$dest" ]]; then
            print_msg "$YELLOW" "  Warning: $source_name already exists. Overwriting..."
        fi

        cp "$source" "$dest"
        print_msg "$GREEN" "  ✓ Installed file: $source_name"
    else
        error_exit "Source is neither a file nor directory: $source"
    fi
}

# Main function
main() {
    local location="global"
    local ext_type=""
    local sources=()

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                ;;
            -v|--version)
                show_version
                ;;
            -g|--global)
                location="global"
                shift
                ;;
            -l|--local)
                location="local"
                shift
                ;;
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                if [[ -z "$ext_type" ]]; then
                    ext_type=$(validate_type "$1")
                else
                    sources+=("$1")
                fi
                shift
                ;;
        esac
    done

    # Validate arguments
    if [[ -z "$ext_type" ]]; then
        error_exit "Extension type required. Use --help for usage information."
    fi

    if [[ ${#sources[@]} -eq 0 ]]; then
        error_exit "At least one source required. Use --help for usage information."
    fi

    # Get installation directory
    local install_dir
    install_dir=$(get_install_dir "$location" "$ext_type")

    print_msg "$BLUE" "Installation directory: $install_dir"
    echo

    # Install each source
    local success_count=0
    local fail_count=0

    for source in "${sources[@]}"; do
        if install_extension "$source" "$ext_type" "$install_dir"; then
            ((success_count++))
        else
            ((fail_count++))
            print_msg "$RED" "  ✗ Failed to install: $source"
        fi
    done

    # Summary
    echo
    print_msg "$GREEN" "Installation complete!"
    print_msg "$BLUE" "  Successful: $success_count"
    if [[ $fail_count -gt 0 ]]; then
        print_msg "$RED" "  Failed: $fail_count"
    fi
}

# Run main function
main "$@"
